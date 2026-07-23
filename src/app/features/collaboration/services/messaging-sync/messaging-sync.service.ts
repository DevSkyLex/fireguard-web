import { inject, Injectable } from '@angular/core';
import { Dispatcher } from '@ngrx/signals/events';
import { firstValueFrom } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { MessageService, MessagingOutboxRepository } from '@features/collaboration/data-access';
import type { MessagingOutboxOperation } from '@features/collaboration/models';
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
  /** Operations that reached the server. */
  readonly replayed: number;
  /** Operations left queued because the failure looked temporary. */
  readonly deferred: number;
  /** Operations that will not be retried without the member asking. */
  readonly failed: number;
}

/**
 * Service MessagingSyncService
 * @class MessagingSyncService
 *
 * @description
 * Replays the messaging outbox.
 *
 * Two rules shape it.
 *
 * **Order is preserved per conversation.** Operations replay sequentially, and
 * the first temporary failure in a conversation stops that conversation's
 * chain — sending the third message of a thread before the second would be
 * worse than sending both a minute later. Other conversations keep going.
 *
 * **A conflict is a success.** A replayed client id answers `409`
 * `/problems/client-resource-already-exists`, which means the message is
 * already stored: the operation is dequeued, not retried and not shown as an
 * error. This is the whole reason the send route takes a client-minted id.
 *
 * It decides *what* a failure means; it does not decide *when* to try. That
 * belongs to the coordinator.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MessagingSyncService {
  //#region Properties
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
   * @return {Promise<MessagingReplayResult>} What the pass achieved.
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
   * @return {Promise<MessagingReplayResult>} What the pass achieved.
   */
  private async drain(): Promise<MessagingReplayResult> {
    const operations: readonly MessagingOutboxOperation[] = await this.outbox.list();

    const blocked = new Set<string>();
    const replayedByConversation = new Map<string, string[]>();
    const failedByConversation = new Map<string, string[]>();
    let replayed = 0;
    let deferred = 0;
    let failed = 0;

    // Chained rather than looped so the operations stay strictly sequential:
    // sending the third message of a thread before the second is worse than
    // sending both a minute later.
    await operations.reduce(
      (chain: Promise<void>, operation: MessagingOutboxOperation): Promise<void> =>
        chain.then(async (): Promise<void> => {
          // Left for the member to act on; not this pass's business.
          if (operation.status === 'failed') return;

          if (blocked.has(operation.conversationId)) {
            deferred += 1;

            return;
          }

          const outcome: 'done' | 'defer' | 'failed' = await this.replayOne(operation);

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
      this.dispatcher.dispatch(messagingSyncEvents.replayed({ conversationId, clientIds }));
    }

    for (const [conversationId, clientIds] of failedByConversation) {
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
   *
   * @return {Promise<'done' | 'defer' | 'failed'>} Whether it left, should wait, or gave up.
   */
  private async replayOne(
    operation: MessagingOutboxOperation,
  ): Promise<'done' | 'defer' | 'failed'> {
    try {
      await firstValueFrom(
        this.messages.postMessageWithClientId(
          operation.payload.conversationId,
          operation.payload.clientId,
          operation.payload.input,
        ),
      );

      await this.outbox.remove(operation.id);

      return 'done';
    } catch (error: unknown) {
      const status: number = isApiError(error) ? error.status : 0;

      // The id was already used: the message is stored, the work is done.
      if (status === 409) {
        await this.outbox.remove(operation.id);

        return 'done';
      }

      // No response, or the server is having a bad time — worth another pass.
      if (status === 0 || status >= 500 || status === 429) return 'defer';

      // A rejection the server will repeat forever. Stop asking.
      await this.outbox.markFailed(operation.id, describe(error, status));

      return 'failed';
    }
  }
  //#endregion
}

/** Groups a client id under its conversation. */
function record(target: Map<string, string[]>, operation: MessagingOutboxOperation): void {
  const clientIds: string[] = target.get(operation.conversationId) ?? [];
  clientIds.push(operation.payload.clientId);
  target.set(operation.conversationId, clientIds);
}

/** A message the member can act on, rather than a status code. */
function describe(error: unknown, status: number): string {
  if (isApiError(error) && error.detail) return error.detail;

  return `The message was refused (${status}).`;
}
