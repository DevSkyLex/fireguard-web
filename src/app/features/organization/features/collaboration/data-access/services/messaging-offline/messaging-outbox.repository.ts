import { inject, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import type {
  MessagingOutboxOperation,
  MessagingOutboxPayloadMap,
  MessagingOutboxType,
} from '@features/organization/features/collaboration/models';
import { MessagingDatabaseService } from './messaging-database.service';

/**
 * Constant OUTBOX_STORE
 *
 * @description
 * The single object store this repository owns.
 *
 * @type {string}
 */
const OUTBOX_STORE = 'outbox';

/**
 * Service MessagingOutboxRepository
 * @class MessagingOutboxRepository
 *
 * @description
 * The durable queue of messaging work that has not reached the server yet.
 * It is policy-free on purpose: it stores, orders and counts operations, and
 * knows nothing about when to retry or what a failure means. That belongs to
 * the sync service, exactly as it does on the interventions side.
 * Ordering is guaranteed on write rather than by an index — the database
 * declares none — through a monotonic stamp, and re-applied on read by sorting
 * on it. Two sends queued in the same millisecond would otherwise be
 * indistinguishable, and a conversation whose messages replay out of order is
 * worse than one that replays slowly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessagingOutboxRepository {
  //#region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Auth-owned revision fencing asynchronous outbox mutations and reads.
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
   * Account identity owning durable message operations.
   *
   * @access private
   * @since unreleased
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);

  /**
   * Property database
   * @readonly
   *
   * @description
   * The messaging local database.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessagingDatabaseService}
   */
  private readonly database: MessagingDatabaseService = inject(MessagingDatabaseService);

  /**
   * Property queued
   * @readonly
   *
   * @description
   * Backing signal of {@link pendingCount}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly queued: WritableSignal<number> = signal<number>(0);

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Backing signal of {@link failedCount}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly failed: WritableSignal<number> = signal<number>(0);

  /**
   * Property lastQueuedAt
   *
   * @description
   * Highest stamp handed out, so two writes in the same millisecond still
   * order.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private lastQueuedAt = 0;

  /**
   * Property pendingCount
   * @readonly
   *
   * @description
   * Operations still waiting to reach the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly pendingCount: Signal<number> = this.queued.asReadonly();

  /**
   * Property failedCount
   * @readonly
   *
   * @description
   * Operations that will not be retried without the member asking.
   * Kept apart from {@link pendingCount} so nothing waiting for the queue to
   * drain deadlocks on work that can never drain on its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly failedCount: Signal<number> = this.failed.asReadonly();
  //#endregion

  //#region Methods
  /**
   * Method queue
   * @method queue
   *
   * @description
   * Appends one operation to the queue.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Conversation the work belongs to.
   * @param {Type} type - Operation kind.
   * @param {MessagingOutboxPayloadMap[Type]} payload - Operation payload.
   *
   * @returns {Promise<string>} The new outbox row id.
   */
  public async queue<Type extends MessagingOutboxType>(
    conversationId: string,
    type: Type,
    payload: MessagingOutboxPayloadMap[Type],
  ): Promise<string> {
    const isCurrent = this.captureMutationContext();
    await this.database.ensureOwnerBound();
    this.assertCurrent(isCurrent);

    const queuedAt: number = Math.max(Date.now(), this.lastQueuedAt + 1);
    this.lastQueuedAt = queuedAt;

    const operation = {
      id: crypto.randomUUID(),
      conversationId,
      type,
      payload,
      createdAt: new Date(queuedAt).toISOString(),
      status: 'pending',
      error: null,
    } satisfies MessagingOutboxOperation;

    await this.database.put(OUTBOX_STORE, operation.id, operation, isCurrent);
    this.assertCurrent(isCurrent);
    this.queued.update((count: number): number => count + 1);

    return operation.id;
  }

  /**
   * Method list
   * @method list
   *
   * @description
   * Every queued operation, oldest first.
   * Sorting happens here because the database has no index: ISO-8601 sorts
   * lexicographically, and the row id breaks any remaining tie deterministically.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<readonly MessagingOutboxOperation[]>} The queue in replay order.
   */
  public async list(): Promise<readonly MessagingOutboxOperation[]> {
    if (!this.database.browser) return [];
    const isCurrent = this.captureMutationContext();
    await this.database.ensureOwnerBound();
    this.assertCurrent(isCurrent);

    const operations: readonly MessagingOutboxOperation[] =
      await this.database.getAll<MessagingOutboxOperation>(OUTBOX_STORE);
    this.assertCurrent(isCurrent);

    return operations.toSorted(
      (left: MessagingOutboxOperation, right: MessagingOutboxOperation): number =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  /**
   * Method listForConversation
   * @method listForConversation
   *
   * @description
   * The queue narrowed to one conversation, oldest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} conversationId - Conversation to filter on.
   *
   * @returns {Promise<readonly MessagingOutboxOperation[]>} That conversation's queue.
   */
  public async listForConversation(
    conversationId: string,
  ): Promise<readonly MessagingOutboxOperation[]> {
    const operations: readonly MessagingOutboxOperation[] = await this.list();

    return operations.filter(
      (operation: MessagingOutboxOperation): boolean => operation.conversationId === conversationId,
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Drops an operation. Called when it succeeded, or when the server reports
   * the client id was already used — both mean the work is done.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Outbox row id.
   *
   * @returns {Promise<void>} A promise resolving once the row is gone.
   */
  public async remove(id: string): Promise<void> {
    const isCurrent = this.captureMutationContext();
    await this.database.ensureOwnerBound();
    this.assertCurrent(isCurrent);
    await this.database.remove(OUTBOX_STORE, id, isCurrent);
    this.assertCurrent(isCurrent);
    await this.refresh();
  }

  /**
   * Method markFailed
   * @method markFailed
   *
   * @description
   * Records that an operation will not be retried on its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Outbox row id.
   * @param {string} error - Why it failed, for the member.
   *
   * @returns {Promise<void>} A promise resolving once the row is updated.
   */
  public async markFailed(id: string, error: string): Promise<void> {
    const isCurrent = this.captureMutationContext();
    await this.database.ensureOwnerBound();
    this.assertCurrent(isCurrent);

    const operation = await this.database.get<MessagingOutboxOperation>(OUTBOX_STORE, id);
    this.assertCurrent(isCurrent);

    if (!operation) return;

    await this.database.put(OUTBOX_STORE, id, { ...operation, status: 'failed', error }, isCurrent);
    this.assertCurrent(isCurrent);
    await this.refresh();
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Returns a failed operation to the queue at the member's request.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Outbox row id.
   *
   * @returns {Promise<void>} A promise resolving once the row is pending again.
   */
  public async retry(id: string): Promise<void> {
    const isCurrent = this.captureMutationContext();
    await this.database.ensureOwnerBound();
    this.assertCurrent(isCurrent);

    const operation = await this.database.get<MessagingOutboxOperation>(OUTBOX_STORE, id);
    this.assertCurrent(isCurrent);

    if (!operation) return;

    await this.database.put(
      OUTBOX_STORE,
      id,
      { ...operation, status: 'pending', error: null },
      isCurrent,
    );
    this.assertCurrent(isCurrent);
    await this.refresh();
  }

  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Recomputes the counters from what is actually stored.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<void>} A promise resolving once the signals match the store.
   */
  public async refresh(): Promise<void> {
    if (!this.database.browser) return;

    const isCurrent = this.captureMutationContext();
    const operations: readonly MessagingOutboxOperation[] = await this.list();
    this.assertCurrent(isCurrent);

    // An operation written before `status` existed reads back undefined and
    // must count as pending, not as an unknown state.
    this.queued.set(
      operations.filter(
        (operation: MessagingOutboxOperation): boolean =>
          operation.status === 'pending' || operation.status === undefined,
      ).length,
    );
    this.failed.set(
      operations.filter(
        (operation: MessagingOutboxOperation): boolean => operation.status === 'failed',
      ).length,
    );
  }
  /**
   * Method captureMutationContext
   * @method captureMutationContext
   *
   * @description
   * Captures the session and durable owner before asynchronous database setup.
   *
   * @access private
   * @since unreleased
   *
   * @returns {() => boolean} Guard also evaluated immediately before opening a write transaction.
   */
  private captureMutationContext(): () => boolean {
    const revision = this.session.sessionRevision();
    const owner = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
    return (): boolean =>
      owner !== null &&
      this.session.isAuthenticated() &&
      revision === this.session.sessionRevision() &&
      owner === (this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null);
  }

  /**
   * Method assertCurrent
   * @method assertCurrent
   *
   * @description
   * Stops obsolete local work without publishing counts or mutating the replacement owner's queue.
   *
   * @access private
   * @since unreleased
   *
   * @param {() => boolean} isCurrent - Captured session and owner guard.
   *
   * @returns {void}
   */
  private assertCurrent(isCurrent: () => boolean): void {
    if (!isCurrent()) throw new DOMException('Offline operation ownership changed.', 'AbortError');
  }
  //#endregion
}
