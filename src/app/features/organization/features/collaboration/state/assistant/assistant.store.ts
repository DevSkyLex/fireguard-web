import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  concatMap,
  EMPTY,
  exhaustMap,
  map,
  type Observable,
  of,
  pipe,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { CookieService } from '@core/cookie';
import { MercureService } from '@core/mercure';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  type StoreError,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ASSISTANT_MESSAGES_PAGE_SIZE,
  AssistantService,
} from '@features/organization/features/collaboration/data-access';
import type {
  AskAssistantQuestionOutput,
  AssistantFrame,
  AssistantMessageOutput,
  AssistantSubscriptionOutput,
  AssistantThreadDetailOutput,
  AssistantThreadOutput,
} from '@features/organization/features/collaboration/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import {
  ASSISTANT_STALL_TIMEOUT_MS,
  ASSISTANT_SUBSCRIPTION_REFRESH_MS,
  ASSISTANT_THREAD_COOKIE_MAX_AGE,
  ASSISTANT_THREAD_COOKIE_PREFIX,
} from './constants';
import type { AssistantState } from './models';
import { applyAssistantFrame } from './utils';

/**
 * Everything about the conversation itself — reset whenever the thread is
 * abandoned. Kept apart from the panel fields so that starting over, or
 * switching organization, does not yank the panel out of the slot the member
 * just put it in.
 */
const INITIAL_THREAD_STATE = {
  threadId: null,
  topic: null,
  messages: [],
  messagesTotal: 0,
  threadCallState: idleCallState(),
  askCallState: idleCallState(),
  controlCallState: idleCallState(),
  generatingMessageId: null,
  generationStalled: false,
} satisfies Omit<AssistantState, 'panelOpen'>;

const INITIAL_STATE: AssistantState = {
  ...INITIAL_THREAD_STATE,
  panelOpen: false,
};

/** Cookie holding the remembered thread of one organization. */
function cookieName(organization: string): string {
  return `${ASSISTANT_THREAD_COOKIE_PREFIX}${organization}`;
}

/**
 * Function toFrame
 * @description Normalizes a persisted reply to the realtime contract.
 * @access private
 * @since 1.1.0
 * @param {AssistantMessageOutput} message - Server reply.
 * @returns {AssistantFrame} The canonical accumulated update.
 */
function toFrame(message: AssistantMessageOutput): AssistantFrame {
  return {
    ...message,
    messageId: message.id,
    tokenCount: message.tokenCount ?? null,
    errorCode: message.errorCode ?? null,
  };
}

/**
 * Constant AssistantStore
 * @const AssistantStore
 *
 * @description
 * The assistant panel's thread and its live generation.
 *
 * **Provided by the workspace route, not root.** It needs the active
 * organization, which lives behind `ORGANIZATION_CONTEXT_PORT` — a route
 * binding a root injector cannot see. Being route-provided also makes it
 * visible to the `PANEL_SLOT` factory, evaluated in that same environment
 * injector.
 *
 * The current thread is remembered per organization. Persisted partial replies
 * are merged with monotonic Mercure frames using attempt identity and sequence.
 * Silence prompts a canonical read; only a server command cancels a generation.
 * Subscriber tokens are renewed while the panel owns the conversation.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AssistantStore = signalStore(
  withState<AssistantState>(INITIAL_STATE),

  withComputed((store, permissions = inject(OrganizationPermissionService)) => ({
    /**
     * Whether the member may use the assistant at all.
     *
     * Every endpoint is guarded by this permission, so without it the panel
     * and its toggle must not appear — a control whose only outcome is a 403
     * is worse than no control.
     */
    isAvailable: computed((): boolean =>
      permissions.hasPermission(ORGANIZATION_PERMISSION.ASSISTANT_USE),
    ),

    isLoading: computed((): boolean => isCallPending(store.threadCallState())),
    isControlling: computed((): boolean => isCallPending(store.controlCallState())),
    controlError: computed((): StoreError | null => store.controlCallState().error),
    isAsking: computed((): boolean => isCallPending(store.askCallState())),
    loadError: computed((): StoreError | null => store.threadCallState().error),
    askError: computed((): StoreError | null => store.askCallState().error),

    /** Whether a reply is being produced right now. */
    isGenerating: computed((): boolean => store.generatingMessageId() !== null),

    /**
     * Whether turns exist before the loaded page.
     *
     * Surfaced rather than paged: messages come back oldest-first with a plain
     * offset, so a correct history pager is its own design problem.
     */
    hasEarlierMessages: computed((): boolean => store.messagesTotal() > store.messages().length),
  })),

  withMethods(
    (
      store,
      service = inject(AssistantService),
      mercure = inject(MercureService),
      cookies = inject(CookieService),
      organizationContext = inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT),
    ) => {
      /** Bare id of the organization the panel is scoped to, from the URL. */
      let scopeRevision = 0;

      function organizationId(): string | null {
        return organizationContext.selectedOrganizationId();
      }

      /** Remembers, or forgets, the thread of the active organization. */
      function rememberThread(organization: string, threadId: string | null): void {
        if (threadId === null) {
          cookies.deleteCookie(cookieName(organization));

          return;
        }

        cookies.setCookie<string>({
          name: cookieName(organization),
          value: threadId,
          path: '/',
          maxAge: ASSISTANT_THREAD_COOKIE_MAX_AGE,
          sameSite: 'Lax',
        });
      }

      /**
       * Reads a thread's **last** message page.
       *
       * Two requests, and unavoidably so: the endpoint pages oldest-first from
       * an offset, so the newest turns are on the last page and the only way to
       * learn which page that is, is to ask for the first and read
       * `messagesTotal`.
       */
      function readLatest(
        organization: string,
        threadId: string,
      ): Observable<AssistantThreadDetailOutput> {
        return service.getThread(organization, threadId).pipe(
          switchMap((first: AssistantThreadDetailOutput) => {
            const lastPage: number = Math.max(
              1,
              Math.ceil(first.messagesTotal / ASSISTANT_MESSAGES_PAGE_SIZE),
            );

            return lastPage === first.messagesPage
              ? of(first)
              : service.getThread(organization, threadId, lastPage);
          }),
        );
      }

      /**
       * Function acceptDetail
       * @description Keeps newer live attempts when an older HTTP response arrives.
       * @access private
       * @since 1.1.0
       * @param {AssistantThreadDetailOutput} detail - Persisted page.
       * @returns {void}
       */
      function acceptDetail(detail: AssistantThreadDetailOutput): void {
        const messages = detail.messages.map((incoming) => {
          const current = store.messages().find((item) => item.id === incoming.id);
          return current ? applyAssistantFrame([current], toFrame(incoming))[0] : incoming;
        });
        // A read started before an accepted question must not remove its new turns.
        for (const current of store.messages()) {
          if (!messages.some((item) => item.id === current.id)) messages.push(current);
        }
        const generating =
          messages.findLast((item) => item.status === 'pending' || item.status === 'streaming')
            ?.id ?? null;
        patchState(store, {
          threadId: detail.id,
          messages,
          messagesTotal: Math.max(detail.messagesTotal, messages.length),
          generatingMessageId: generating,
          generationStalled: false,
        });
        watchForStall(generating);
      }

      /**
       * Ends the wait on a generation that has gone quiet for too long.
       *
       * Re-armed on every frame, so the timeout measures silence rather than
       * total duration — a long but healthy answer never trips it.
       *
       * On firing it re-reads the thread rather than declaring a stall blindly:
       * a quiet generation may simply have lost its terminal frame (the Mercure
       * frame is otherwise the only path to the reply). If the server now holds
       * a finished reply, it is recovered; only a genuinely unfinished one is
       * reported as stalled.
       */
      const watchForStall = rxMethod<string | null>(
        pipe(
          switchMap((messageId: string | null) => {
            if (messageId === null) return EMPTY;

            const revision = scopeRevision;
            return timer(ASSISTANT_STALL_TIMEOUT_MS).pipe(
              switchMap(() => {
                const organization: string | null = organizationId();
                const threadId: string | null = store.threadId();

                if (organization === null || threadId === null) {
                  patchState(store, { generationStalled: true });

                  return EMPTY;
                }

                return readLatest(organization, threadId).pipe(
                  tap((detail: AssistantThreadDetailOutput): void => {
                    if (scopeRevision !== revision) return;
                    acceptDetail(detail);
                    patchState(store, {
                      generationStalled: store.generatingMessageId() === messageId,
                    });
                  }),
                  catchError(() => {
                    if (scopeRevision !== revision) return EMPTY;
                    patchState(store, { generationStalled: true });

                    return EMPTY;
                  }),
                );
              }),
            );
          }),
        ),
      );

      /**
       * Function acceptFrame
       * @description Accepts monotonic updates for the current attempt and leaves late frames inert.
       * @access private
       * @since 1.1.0
       * @param {AssistantFrame} frame - Canonical accumulated update.
       * @returns {void}
       */
      function acceptFrame(frame: AssistantFrame): void {
        const messages = applyAssistantFrame(store.messages(), frame);
        if (messages === store.messages()) return;
        const generating =
          messages.findLast(
            (message) => message.status === 'pending' || message.status === 'streaming',
          )?.id ?? null;
        patchState(store, { messages, generatingMessageId: generating, generationStalled: false });
        watchForStall(generating);
      }

      /**
       * Subscribes to a thread's topic and keeps the token fresh, or tears the
       * connection down when passed `null`.
       *
       * `timer(0, …)` re-mints on a schedule. The new token is minted
       * (`concatMap`) **before** the `switchMap` swaps the connection, so the
       * previous `EventSource` stays open across the refresh round trip instead
       * of leaving a gap in which frames are lost. A failed mint yields nothing
       * that tick, which keeps the current connection alive until the next one
       * succeeds. Passing `null` (a new thread, or starting over) switches to
       * `EMPTY`, closing the socket rather than leaking it.
       */
      const connect = rxMethod<string | null>(
        pipe(
          switchMap((threadId: string | null) => {
            const organization: string | null = organizationId();

            if (threadId === null || organization === null) return EMPTY;

            return timer(0, ASSISTANT_SUBSCRIPTION_REFRESH_MS).pipe(
              concatMap(() =>
                service
                  .getSubscription(organization, threadId)
                  // A failed refresh must not kill the stream; skip this tick
                  // and keep the live connection until the next mint succeeds.
                  .pipe(catchError(() => EMPTY)),
              ),
              tap((subscription: AssistantSubscriptionOutput) =>
                patchState(store, { topic: subscription.topic }),
              ),
              switchMap((subscription: AssistantSubscriptionOutput) =>
                mercure
                  .subscribe<AssistantFrame>(subscription.topic, subscription.token)
                  // Realtime is how the answer arrives, but losing it must not
                  // take the panel down with it.
                  .pipe(catchError(() => EMPTY)),
              ),
              tap((frame: AssistantFrame): void => acceptFrame(frame)),
            );
          }),
        ),
      );

      /** Reads a remembered thread's last page. */
      const loadThread = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { threadCallState: pendingCallState() })),
          switchMap((threadId: string) => {
            const organization: string | null = organizationId();

            if (organization === null) return EMPTY;

            const revision = scopeRevision;
            return readLatest(organization, threadId).pipe(
              tapResponse({
                next: (detail: AssistantThreadDetailOutput): void => {
                  if (scopeRevision !== revision) return;
                  acceptDetail(detail);
                  patchState(store, { threadCallState: successCallState(null) });
                },
                error: (error: unknown): void => {
                  if (scopeRevision !== revision) return;
                  const storeError: StoreError = toStoreError(error);

                  // A remembered thread the server no longer has is not an
                  // error the user can act on — forget it and start clean.
                  if (storeError.code === 404) {
                    rememberThread(organization, null);
                    patchState(store, { ...INITIAL_THREAD_STATE });

                    return;
                  }

                  patchState(store, { threadCallState: errorCallState(storeError) });
                },
              }),
            );
          }),
        ),
      );

      const controlAttempt = rxMethod<{ messageId: string; retry: boolean }>(
        pipe(
          exhaustMap(({ messageId, retry }) => {
            const organization = organizationId();
            const threadId = store.threadId();
            const message = store.messages().find((item) => item.id === messageId);
            if (
              !organization ||
              !threadId ||
              !message?.attemptId ||
              !(retry ? message.canRetry : message.canCancel)
            )
              return EMPTY;
            const revision = scopeRevision;
            patchState(store, { controlCallState: pendingCallState() });
            return service
              .controlAttempt(organization, threadId, messageId, message.attemptId, retry)
              .pipe(
                tapResponse({
                  next: (reply) => {
                    if (scopeRevision !== revision) return;
                    acceptFrame(toFrame(reply));
                    patchState(store, { controlCallState: successCallState(null) });
                  },
                  error: (error: unknown) => {
                    if (scopeRevision !== revision) return;
                    patchState(store, { controlCallState: errorCallState(toStoreError(error)) });
                    loadThread(threadId);
                  },
                }),
              );
          }),
        ),
      );

      return {
        controlAttempt,
        /**
         * Restores the remembered thread of an organization, resetting first.
         *
         * Driven by the routed organization id, so switching organization drops
         * the previous transcript instead of showing it under the wrong tenant
         * — and does so as soon as the URL changes, without waiting for the
         * organization resource to load.
         */
        resume: rxMethod<string | null>(
          tap((organization: string | null): void => {
            ++scopeRevision;
            watchForStall(null);
            connect(null);
            patchState(store, { ...INITIAL_THREAD_STATE });

            if (organization === null) return;

            const remembered: string | null = cookies.getCookie<string>(cookieName(organization));

            if (remembered === null || remembered === '') return;

            patchState(store, { threadId: remembered });
            connect(remembered);
            loadThread(remembered);
          }),
        ),

        /**
         * Asks a question, creating the thread on the first one.
         *
         * Both turns are appended from the `201` body: the question, and the
         * reply placeholder that arrives `pending`. No `pending` frame is ever
         * published, so waiting for one would wait forever.
         */
        ask: rxMethod<string>(
          pipe(
            exhaustMap((body: string) => {
              const organization: string | null = organizationId();

              if (organization === null || !store.isAvailable() || store.isControlling())
                return EMPTY;
              const revision = scopeRevision;

              patchState(store, { askCallState: pendingCallState() });

              const threadId: string | null = store.threadId();
              const isNewThread: boolean = threadId === null;
              const thread: Observable<string> = isNewThread
                ? service.startThread(organization).pipe(
                    tap((created: AssistantThreadOutput): void => {
                      if (scopeRevision !== revision) return;
                      patchState(store, { threadId: created.id });
                      rememberThread(organization, created.id);
                    }),
                    map((created: AssistantThreadOutput): string => created.id),
                  )
                : of(threadId as string);

              return thread.pipe(
                switchMap((id: string) =>
                  scopeRevision !== revision
                    ? EMPTY
                    : service
                        .ask(organization, id, { body })
                        .pipe(map((result: AskAssistantQuestionOutput) => ({ result, id }))),
                ),
                tapResponse({
                  next: ({
                    result,
                    id,
                  }: {
                    result: AskAssistantQuestionOutput;
                    id: string;
                  }): void => {
                    if (scopeRevision !== revision) return;
                    patchState(store, {
                      messages: [...store.messages(), result.userMessage, result.assistantMessage],
                      messagesTotal: store.messagesTotal() + 2,
                      generatingMessageId: result.assistantMessage.id,
                      generationStalled: false,
                      askCallState: successCallState(null),
                    });
                    watchForStall(result.assistantMessage.id);

                    // Subscribe only now, once the reply placeholder is on
                    // screen, so the first frame can never arrive for a turn the
                    // transcript does not yet hold and be dropped. An existing
                    // thread is already connected from resume or a prior ask.
                    if (isNewThread) connect(id);
                  },
                  error: (error: unknown): void => {
                    if (scopeRevision !== revision) return;
                    patchState(store, { askCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),

        /** Requests server cancellation of the stalled attempt. */
        dismissStalled(): void {
          const messageId = store.generatingMessageId();
          if (messageId) controlAttempt({ messageId, retry: false });
        },

        /**
         * Forgets the current thread and starts a new conversation.
         *
         * The old thread is left on the server: nothing can delete it, and the
         * organization owner can still read it through the API.
         */
        startNewThread(): void {
          ++scopeRevision;
          const organization: string | null = organizationId();

          if (organization !== null) rememberThread(organization, null);

          patchState(store, { ...INITIAL_THREAD_STATE });
          watchForStall(null);
          // Close the previous thread's socket; the next question opens a fresh
          // one. Without this the old EventSource leaks and keeps applying
          // frames from a thread the panel has left.
          connect(null);
        },

        /**
         * Opens the assistant sheet.
         *
         * The flag is the whole state: `AssistantToggle` reads it to open its
         * right-anchored `hlm-sheet` and to keep the trigger's `aria-expanded`
         * honest. Closing needs nothing handed back.
         */
        openPanel(): void {
          patchState(store, { panelOpen: true });
        },

        /**
         * Releases the column.
         */
        closePanel(): void {
          patchState(store, { panelOpen: false });
        },

        loadThread,
        connect,
      };
    },
  ),

  withHooks(
    (store, organizationContext = inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT)) => ({
      onInit(): void {
        store.resume(organizationContext.selectedOrganizationId);
      },
    }),
  ),
);

/**
 * Type AssistantStoreType
 *
 * @description
 * Injection type of {@link AssistantStore}.
 *
 * @since 1.0.0
 */
export type AssistantStoreType = InstanceType<typeof AssistantStore>;
