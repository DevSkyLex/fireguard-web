import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService, resilientMercureStream } from '@core/mercure';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { AssistantService } from '@features/organization/features/assistant/data-access';
import type {
  AskAssistantOutput,
  AssistantGenerationEvent,
  AssistantMessage,
  AssistantThread,
} from '@features/organization/features/assistant/models';

/**
 * State of the assistant workspace.
 *
 * @since 1.0.0
 */
interface AssistantThreadState {
  readonly threadsCallState: CallState<readonly AssistantThread[]>;
  readonly messagesCallState: CallState<readonly AssistantMessage[]>;
  readonly askCallState: CallState<AskAssistantOutput>;
  readonly organizationId: string | null;
  readonly activeThreadId: string | null;
}

const INITIAL_STATE: AssistantThreadState = {
  threadsCallState: idleCallState(),
  messagesCallState: idleCallState(),
  askCallState: idleCallState(),
  organizationId: null,
  activeThreadId: null,
};

/** Replaces a message by id, or appends it when it is new. */
function upsert(
  messages: readonly AssistantMessage[],
  incoming: AssistantMessage,
): readonly AssistantMessage[] {
  const index: number = messages.findIndex((message) => message.id === incoming.id);
  return index === -1 ? [...messages, incoming] : messages.with(index, incoming);
}

/**
 * Folds a Mercure generation frame into the answer it belongs to.
 *
 * The frame is not a message — it carries only the generated text and its
 * status — so it is merged onto the row the POST already created. A frame for
 * a message the thread does not hold is dropped: inventing a row from it would
 * mean guessing its author and its timestamp.
 */
function applyGenerationEvent(
  messages: readonly AssistantMessage[],
  event: AssistantGenerationEvent,
): readonly AssistantMessage[] {
  const index: number = messages.findIndex((message) => message.id === event.messageId);
  if (index === -1) return messages;

  const target: AssistantMessage = messages[index] as AssistantMessage;

  return messages.with(index, {
    ...target,
    body: event.body,
    status: event.status,
    tokenCount: event.tokenCount,
    errorCode: event.errorCode,
  });
}

/**
 * Store AssistantThreadStore
 * @const AssistantThreadStore
 *
 * @description
 * Owns the assistant workspace: the member's threads, the open thread's turns,
 * and asking.
 *
 * An answer arrives `pending` with an empty body and fills in over Mercure, so
 * every incoming message is upserted by id rather than appended — otherwise a
 * streaming answer would stack up one copy per chunk.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AssistantThreadStore = signalStore(
  //#region State
  withState<AssistantThreadState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed threads
     *
     * @type {Signal<readonly AssistantThread[]>}
     */
    threads: computed<readonly AssistantThread[]>(() => store.threadsCallState().data ?? []),

    /**
     * Computed messages
     *
     * @description
     * The open thread's turns, oldest first.
     *
     * @type {Signal<readonly AssistantMessage[]>}
     */
    messages: computed<readonly AssistantMessage[]>(() =>
      (store.messagesCallState().data ?? []).toSorted((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      ),
    ),

    /**
     * Computed isAnswering
     *
     * @description
     * True while an answer is still being produced, so the composer can stay
     * disabled and a second question cannot race the first.
     *
     * @type {Signal<boolean>}
     */
    isAnswering: computed<boolean>(
      () =>
        isCallPending(store.askCallState()) ||
        (store.messagesCallState().data ?? []).some(
          (message: AssistantMessage) =>
            message.role === 'assistant' &&
            (message.status === 'pending' || message.status === 'streaming'),
        ),
    ),

    /**
     * Computed isLoadingThreads
     *
     * @type {Signal<boolean>}
     */
    isLoadingThreads: computed<boolean>(() => isCallPending(store.threadsCallState())),

    /**
     * Computed isLoadingMessages
     *
     * @type {Signal<boolean>}
     */
    isLoadingMessages: computed<boolean>(() => isCallPending(store.messagesCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(AssistantService), mercure = inject(MercureService)) => {
    const stream = rxMethod<string | null>(
      pipe(
        switchMap((threadId: string | null) => {
          const organizationId: string | null = store.organizationId();
          if (threadId === null || organizationId === null) return EMPTY;

          return resilientMercureStream<AssistantGenerationEvent>(() =>
            service
              .getSubscription(organizationId, threadId)
              .pipe(
                map((subscription) =>
                  mercure.subscribe<AssistantGenerationEvent>(
                    subscription.topic,
                    subscription.token,
                  ),
                ),
              ),
          ).pipe(
            tapResponse({
              next: (event: AssistantGenerationEvent) =>
                patchState(store, {
                  messagesCallState: successCallState(
                    applyGenerationEvent(store.messagesCallState().data ?? [], event),
                  ),
                }),
              error: () => undefined,
            }),
          );
        }),
      ),
    );

    return {
      /**
       * Method setOrganization
       *
       * @param {string | null} organizationId - The active organization.
       *
       * @returns {void}
       */
      setOrganization(organizationId: string | null): void {
        patchState(store, { organizationId });
      },

      /**
       * Method loadThreads
       *
       * @param {string | null} organizationId - The organization to load for.
       *
       * @returns {void}
       */
      loadThreads: rxMethod<string | null>(
        pipe(
          tap(() => patchState(store, { threadsCallState: pendingCallState() })),
          switchMap((organizationId: string | null) => {
            if (organizationId === null) return EMPTY;

            return service.listThreads(organizationId).pipe(
              tapResponse({
                next: (collection: HydraCollection<AssistantThread>) =>
                  patchState(store, { threadsCallState: successCallState(collection.member) }),
                error: (error: unknown) =>
                  patchState(store, { threadsCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method openThread
       *
       * @description
       * Loads a thread's turns and follows it for streamed answers.
       *
       * @param {string} threadId - The thread to open.
       *
       * @returns {void}
       */
      openThread: rxMethod<string>(
        pipe(
          tap((threadId: string) =>
            patchState(store, {
              activeThreadId: threadId,
              messagesCallState: pendingCallState(),
            }),
          ),
          switchMap((threadId: string) => {
            const organizationId: string | null = store.organizationId();
            if (organizationId === null) return EMPTY;

            return service.getThread(organizationId, threadId).pipe(
              tapResponse({
                next: (thread: AssistantThread) => {
                  patchState(store, { messagesCallState: successCallState(thread.messages) });
                  stream(threadId);
                },
                error: (error: unknown) =>
                  patchState(store, { messagesCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method ask
       *
       * @description
       * Asks a question in the open thread. Both the question and the pending
       * answer are shown immediately, so the wait is visible rather than silent.
       *
       * @param {string} body - The question.
       *
       * @returns {void}
       */
      ask: rxMethod<string>(
        pipe(
          switchMap((body: string) => {
            const organizationId: string | null = store.organizationId();
            const threadId: string | null = store.activeThreadId();
            if (organizationId === null || threadId === null || body.trim().length === 0) {
              return EMPTY;
            }

            patchState(store, { askCallState: pendingCallState() });

            return service.ask(organizationId, threadId, body.trim()).pipe(
              tapResponse({
                next: (result: AskAssistantOutput) =>
                  patchState(store, {
                    askCallState: successCallState(result),
                    messagesCallState: successCallState(
                      upsert(
                        upsert(store.messagesCallState().data ?? [], result.userMessage),
                        result.assistantMessage,
                      ),
                    ),
                  }),
                error: (error: unknown) =>
                  patchState(store, { askCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
    };
  }),
  //#endregion
);

/**
 * Type AssistantThreadStoreType
 *
 * @description
 * Injectable instance type of {@link AssistantThreadStore}.
 */
export type AssistantThreadStoreType = InstanceType<typeof AssistantThreadStore>;
