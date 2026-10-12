import { inject, Service } from '@angular/core';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { firstValueFrom, takeUntil } from 'rxjs';
import { getIdempotencyErrorCode, isIdempotencyOperationCompleted } from '@core/api';
import { isApiError } from '@core/api/utils';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { authStoreEvents } from '@features/auth/state';
import {
  MessageService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import type { MessagingOutboxOperation } from '@features/organization/features/collaboration/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { messagingSyncEvents } from './events';

/**
 * Interface MessagingReplayResult
 * @interface MessagingReplayResult
 *
 * @description
 * What one replay pass achieved.
 *
 * @since 1.0.0
 */
export interface MessagingReplayResult {
  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Operations that reached the server.
   *
   * @type {number}
   */
  readonly replayed: number;

  /**
   * Property deferred
   * @readonly
   *
   * @description
   * Operations left queued because the failure looked temporary.
   *
   * @type {number}
   */
  readonly deferred: number;

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Operations requiring a member's explicit retry.
   *
   * @type {number}
   */
  readonly failed: number;
}

/**
 * Service MessagingSyncService
 * @class MessagingSyncService
 *
 * @description
 * Replays the messaging outbox.
 * Two rules shape it.
 * **Order is preserved per conversation.** Operations replay sequentially, and
 * the first temporary failure in a conversation stops that conversation's
 * chain — sending the third message of a thread before the second would be
 * worse than sending both a minute later. Other conversations keep going.
 * **Only an explicit acknowledgement is a success.** A replayed client id answers `409`
 * `/problems/client-resource-already-exists`, which means the message is
 * already stored: the operation is dequeued, not retried and not shown as an
 * error. This is the whole reason the send route takes a client-minted id.
 * It decides *what* a failure means; it does not decide *when* to try. That
 * belongs to the coordinator.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessagingSyncService {
  //#region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Auth-owned revision invalidating queued work when the local session changes.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Account identity owning the durable message queue.
   *
   * @access private
   * @since unreleased
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Workspace context invalidating an obsolete replay pass.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property outbox
   * @readonly
   *
   * @description
   * The durable queue being drained.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessagingOutboxRepository}
   */
  private readonly outbox: MessagingOutboxRepository = inject(MessagingOutboxRepository);

  /**
   * Property messages
   * @readonly
   *
   * @description
   * Transport used to replay a queued send.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messages: MessageService = inject(MessageService);

  /**
   * Property dispatcher
   * @readonly
   *
   * @description
   * Where replay outcomes are announced.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Dispatcher}
   */
  private readonly dispatcher: Dispatcher = inject(Dispatcher);

  /**
   * Property events
   * @readonly
   *
   * @description
   * Session-end notifications cancelling the departing account's active replay subscription.
   *
   * @access private
   * @since unreleased
   *
   * @type {Events}
   */
  private readonly events: Events = inject(Events);

  /**
   * Property inFlight
   *
   * @description
   * The pass currently running, if any. Concurrent callers await it instead of
   * starting a second drain over the same rows.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Promise<MessagingReplayResult> | null}
   */
  private inFlight: Promise<MessagingReplayResult> | null = null;
  //#endregion

  //#region Methods
  /**
   * Method replay
   * @method replay
   *
   * @description
   * Drains the outbox once.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<MessagingReplayResult>} What the pass achieved.
   */
  public replay(): Promise<MessagingReplayResult> {
    this.inFlight ??= this.drain().finally((): void => {
      this.inFlight = null;
    });

    return this.inFlight;
  }
  //#endregion

  //#region Internals
  /**
   * Method drain
   * @method drain
   *
   * @description
   * Walks the queue oldest-first, skipping conversations that already hit a
   * temporary failure this pass.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Promise<MessagingReplayResult>} What the pass achieved.
   */
  private async drain(): Promise<MessagingReplayResult> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return { replayed: 0, deferred: 0, failed: 0 };
    const operations: readonly MessagingOutboxOperation[] = await this.outbox.list();

    const blocked = new Set<string>();
    const replayedByConversation = new Map<string, string[]>();
    const failedByConversation = new Map<string, string[]>();
    let replayed = 0;
    let deferred = 0;
    let failed = 0;

    await operations.reduce(
      (chain: Promise<void>, operation: MessagingOutboxOperation): Promise<void> =>
        chain.then(async (): Promise<void> => {
          if (!isCurrent() || operation.status === 'failed') return;

          if (blocked.has(operation.conversationId)) {
            deferred += 1;

            return;
          }

          const outcome = await this.replayOne(operation, isCurrent);
          if (!isCurrent() || outcome === 'obsolete') return;

          if (outcome === 'done') {
            replayed += 1;
            record(replayedByConversation, operation);

            return;
          }

          if (outcome === 'defer') {
            deferred += 1;
            blocked.add(operation.conversationId);

            return;
          }

          failed += 1;
          blocked.add(operation.conversationId);
          record(failedByConversation, operation);
        }),
      Promise.resolve(),
    );

    for (const [conversationId, clientIds] of replayedByConversation) {
      if (!isCurrent()) break;
      this.dispatcher.dispatch(messagingSyncEvents.replayed({ conversationId, clientIds }));
    }

    for (const [conversationId, clientIds] of failedByConversation) {
      if (!isCurrent()) break;
      this.dispatcher.dispatch(messagingSyncEvents.gaveUp({ conversationId, clientIds }));
    }

    return { replayed, deferred, failed };
  }

  /**
   * Method replayOne
   * @method replayOne
   *
   * @description
   * Sends one queued operation and classifies the outcome.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {MessagingOutboxOperation} operation - Queued operation.
   * @param {() => boolean} isCurrent - Whether the initiating session and workspace still own
   *   replay.
   *
   * @returns {Promise<'done' | 'defer' | 'failed' | 'obsolete'>} Replay disposition.
   */
  private async replayOne(
    operation: MessagingOutboxOperation,
    isCurrent: () => boolean,
  ): Promise<'done' | 'defer' | 'failed' | 'obsolete'> {
    if (!isCurrent()) return 'obsolete';
    try {
      const idempotencyKey =
        operation.idempotencyKey ?? (await this.outbox.ensureIdempotencyKey(operation.id));
      if (!isCurrent() || !idempotencyKey) return 'obsolete';
      await firstValueFrom(
        this.messages
          .postMessageWithClientId(
            operation.payload.conversationId,
            operation.payload.clientId,
            operation.payload.input,
            { idempotencyKey },
          )
          .pipe(takeUntil(this.events.on(authStoreEvents.sessionEnded))),
      );

      if (!isCurrent()) return 'obsolete';
      await this.outbox.remove(operation.id);

      return 'done';
    } catch (error: unknown) {
      if (!isCurrent()) return 'obsolete';
      const status: number = isApiError(error) ? error.status : 0;
      if (isIdempotencyOperationCompleted(error)) {
        try {
          await this.reconcileCompletedSend(operation, isCurrent);
          if (!isCurrent()) return 'obsolete';
          await this.outbox.remove(operation.id);
          return isCurrent() ? 'done' : 'obsolete';
        } catch {
          return isCurrent() ? 'defer' : 'obsolete';
        }
      }
      const receiptFailure = getIdempotencyErrorCode(error);
      if (receiptFailure === 'idempotency_in_progress') return 'defer';
      if (receiptFailure) {
        await this.outbox.markFailed(operation.id, describe(error, status));
        return 'failed';
      }

      if (
        status === 409 &&
        isApiError(error) &&
        error.type === '/problems/client-resource-already-exists'
      ) {
        await this.outbox.remove(operation.id);

        return 'done';
      }

      if (status === 0 || status >= 500 || status === 429) return 'defer';

      await this.outbox.markFailed(operation.id, describe(error, status));

      return 'failed';
    }
  }

  /**
   * Method reconcileCompletedSend
   * @method reconcileCompletedSend
   *
   * @description
   * Finds the original native message in its authorized owner projection before an expired
   * completed receipt can remove the durable intent. No message body replaces local drafts.
   *
   * @access private
   * @since unreleased
   *
   * @param {MessagingOutboxOperation} operation - Completed send retaining its native message id.
   * @param {() => boolean} isCurrent - Original session, account and workspace guard.
   * @param {number} [page] - Owner projection page being acquired.
   * @param {number} [inspected] - Rows already inspected without finding the native identity.
   *
   * @returns {Promise<void>} Resolves only after the current owner can read the committed message.
   */
  private async reconcileCompletedSend(
    operation: MessagingOutboxOperation,
    isCurrent: () => boolean,
    page: number = 1,
    inspected: number = 0,
  ): Promise<void> {
    if (!isCurrent()) return;
    const projection = await firstValueFrom(
      this.messages
        .list(operation.conversationId, { page, itemsPerPage: 100 })
        .pipe(takeUntil(this.events.on(authStoreEvents.sessionEnded))),
    );
    if (!isCurrent()) return;
    if (!Array.isArray(projection.member) || !Number.isSafeInteger(projection.totalItems))
      throw new Error('The completed message projection is unavailable.');
    const message = projection.member.find((item) => item.id === operation.payload.clientId);
    if (message?.conversation === `/api/conversations/${operation.conversationId}`) return;
    const nextInspected = inspected + projection.member.length;
    if (projection.member.length === 0 || nextInspected >= projection.totalItems)
      throw new Error('The completed message is unavailable in its conversation.');
    return this.reconcileCompletedSend(operation, isCurrent, page + 1, nextInspected);
  }

  /**
   * Method captureReplayContext
   * @method captureReplayContext
   *
   * @description
   * Captures ownership before loading the queue; replacement sessions invalidate it even for the
   * same account.
   *
   * @access private
   * @since unreleased
   *
   * @returns {() => boolean} Guard checked before every send and replay consequence.
   */
  private captureReplayContext(): () => boolean {
    const revision = this.session.sessionRevision();
    const owner = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
    const organizationId = this.organization.selectedOrganizationId();
    return (): boolean =>
      owner !== null &&
      this.session.isAuthenticated() &&
      revision === this.session.sessionRevision() &&
      owner === (this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null) &&
      organizationId === this.organization.selectedOrganizationId();
  }
  //#endregion
}

/**
 * Function record
 *
 * @description
 * Groups a client id under its conversation for one replay notification.
 *
 * @param {Map<string, string[]>} target - Replay outcomes grouped by conversation.
 * @param {MessagingOutboxOperation} operation - Operation whose client id was replayed.
 *
 * @returns {void}
 */
function record(target: Map<string, string[]>, operation: MessagingOutboxOperation): void {
  const clientIds: string[] = target.get(operation.conversationId) ?? [];
  clientIds.push(operation.payload.clientId);
  target.set(operation.conversationId, clientIds);
}

/**
 * Function describe
 *
 * @description
 * Describes a permanent rejection for the member who owns the queued operation.
 *
 * @param {unknown} error - Transport rejection.
 * @param {number} status - HTTP rejection status.
 *
 * @returns {string} Actionable failure detail.
 */
function describe(error: unknown, status: number): string {
  if (isApiError(error) && error.detail) return error.detail;

  return `The message was refused (${status}).`;
}
