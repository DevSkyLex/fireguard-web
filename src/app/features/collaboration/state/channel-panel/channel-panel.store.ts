import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, map, pipe, startWith, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import {
  ChannelService,
  ConversationService,
  MessageService,
} from '@features/collaboration/data-access';
import type {
  ChannelOutput,
  ChannelPanelTab,
  ChannelParticipantOutput,
  ConversationActivityBucketOutput,
  ConversationAttachmentOutput,
  MessageOutput,
  MessagingLinkOutput,
} from '@features/collaboration/models';
import type { ChannelPanelState } from './models';
import { readChannelRoute, type ChannelRouteContext } from './utils';

/**
 * Bucket count the heatmap renders. The endpoint clamps to 1–366 and
 * zero-fills, so this is exactly how many cells come back.
 */
const ACTIVITY_BUCKETS = 26;

/** One page is enough to derive nesting: the API caps a page at 100 channels. */
const SIBLINGS_PAGE_SIZE = 100;

const INITIAL_STATE: ChannelPanelState = {
  loadedChannelId: null,
  loadedOrganizationId: null,
  activeTab: 'info',
  channelCallState: idleCallState(),
  participantsCallState: idleCallState(),
  activityCallState: idleCallState(),
  pinsCallState: idleCallState(),
  filesCallState: idleCallState(),
  linksCallState: idleCallState(),
  siblingsCallState: idleCallState(),
};

/**
 * Constant ChannelPanelStore
 * @const ChannelPanelStore
 *
 * @description
 * Everything the channel info panel renders, and the bridge that lets it exist
 * at all.
 *
 * The panel is a `PANEL_SLOT` contribution, so the layout instantiates it and
 * it resolves against the layout's injector — the routed page's
 * component-scoped stores are invisible to it, and it receives no routed
 * input. This store is the sanctioned answer: root-provided, it reads the
 * routed channel off the router itself and republishes it, so both the panel
 * component and the contribution's `active` signal can consume it.
 *
 * Being root-provided has a consequence worth stating: it is built in the root
 * injector, so it cannot see anything the workspace **route** provides —
 * `MEMBER_DIRECTORY_PORT` included. Member names are therefore resolved by the
 * components, which resolve against the layout's injector, not here.
 *
 * Loading is split by cost. Opening a channel fetches the Info tab's three
 * reads eagerly; Pins, Files and Links are fetched the first time their tab is
 * opened and not before.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ChannelPanelStore = signalStore(
  { providedIn: 'root' },
  withState<ChannelPanelState>(INITIAL_STATE),

  withProps(() => {
    const router: Router = inject(Router);

    return {
      /**
       * The routed channel, recomputed on every completed navigation. Seeded
       * with the current route so a direct page load is not missed.
       */
      _route: toSignal<ChannelRouteContext | null>(
        router.events.pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((): ChannelRouteContext | null => readChannelRoute(router.routerState.root)),
          startWith(readChannelRoute(router.routerState.root)),
        ),
        { initialValue: null },
      ),
    };
  }),

  withComputed((store) => ({
    /** Routed channel id, or `null` when the URL is not a conversation. */
    channelId: computed((): string | null => store._route()?.channelId ?? null),
    /** Routed organization id, or `null`. */
    organizationId: computed((): string | null => store._route()?.organizationId ?? null),

    channel: computed((): ChannelOutput | null => store.channelCallState().data ?? null),
    participants: computed(
      (): readonly ChannelParticipantOutput[] => store.participantsCallState().data ?? [],
    ),
    activity: computed(
      (): readonly ConversationActivityBucketOutput[] => store.activityCallState().data ?? [],
    ),
    pins: computed((): readonly MessageOutput[] => store.pinsCallState().data ?? []),
    files: computed(
      (): readonly ConversationAttachmentOutput[] => store.filesCallState().data ?? [],
    ),
    links: computed((): readonly MessagingLinkOutput[] => store.linksCallState().data ?? []),

    isChannelLoading: computed((): boolean => isCallPending(store.channelCallState())),
    isTabLoading: computed((): boolean => {
      switch (store.activeTab()) {
        case 'pins':
          return isCallPending(store.pinsCallState());
        case 'files':
          return isCallPending(store.filesCallState());
        case 'links':
          return isCallPending(store.linksCallState());
        default:
          return isCallPending(store.participantsCallState());
      }
    }),
  })),

  withComputed((store) => ({
    /**
     * Channels nested under this one — the panel's "Linked threads".
     *
     * Derived from the `parent` IRI every row already carries, matched on the
     * last path segment because the id is what is stable, not the IRI.
     */
    children: computed((): readonly ChannelOutput[] => {
      const channelId: string | null = store.channelId();
      const siblings: readonly ChannelOutput[] = store.siblingsCallState().data ?? [];

      if (channelId === null) return [];

      return siblings.filter((candidate: ChannelOutput): boolean => {
        const parent: string | undefined = candidate.parent;

        return parent !== undefined && parent.slice(parent.lastIndexOf('/') + 1) === channelId;
      });
    }),
  })),

  withMethods(
    (
      store,
      channels = inject(ChannelService),
      conversations = inject(ConversationService),
      messages = inject(MessageService),
    ) => {
      const loadChannel = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { channelCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            channels.get(channelId).pipe(
              tapResponse({
                next: (channel: ChannelOutput): void =>
                  patchState(store, { channelCallState: successCallState(channel) }),
                error: (error: unknown): void =>
                  patchState(store, { channelCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      const loadParticipants = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { participantsCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            channels.listParticipants(channelId).pipe(
              tapResponse({
                next: (collection: HydraCollection<ChannelParticipantOutput>): void =>
                  patchState(store, {
                    participantsCallState: successCallState([...collection.member]),
                  }),
                error: (error: unknown): void =>
                  patchState(store, {
                    participantsCallState: errorCallState(toStoreError(error)),
                  }),
              }),
            ),
          ),
        ),
      );

      const loadActivity = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { activityCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            conversations.listActivity(channelId, { buckets: ACTIVITY_BUCKETS }).pipe(
              tapResponse({
                next: (collection: HydraCollection<ConversationActivityBucketOutput>): void =>
                  patchState(store, {
                    activityCallState: successCallState([...collection.member]),
                  }),
                error: (error: unknown): void =>
                  patchState(store, { activityCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      const loadSiblings = rxMethod<string>(
        pipe(
          tap((organizationId: string) =>
            patchState(store, {
              loadedOrganizationId: organizationId,
              siblingsCallState: pendingCallState(),
            }),
          ),
          switchMap((organizationId: string) =>
            channels.list({ organization: organizationId, itemsPerPage: SIBLINGS_PAGE_SIZE }).pipe(
              tapResponse({
                next: (collection: HydraCollection<ChannelOutput>): void =>
                  patchState(store, {
                    siblingsCallState: successCallState([...collection.member]),
                  }),
                error: (error: unknown): void =>
                  patchState(store, { siblingsCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      const loadPins = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { pinsCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            messages.listPinned(channelId).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessageOutput>): void =>
                  patchState(store, { pinsCallState: successCallState([...collection.member]) }),
                error: (error: unknown): void =>
                  patchState(store, { pinsCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      const loadFiles = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { filesCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            conversations.listAttachments(channelId).pipe(
              tapResponse({
                next: (collection: HydraCollection<ConversationAttachmentOutput>): void =>
                  patchState(store, { filesCallState: successCallState([...collection.member]) }),
                error: (error: unknown): void =>
                  patchState(store, { filesCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      const loadLinks = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { linksCallState: pendingCallState() })),
          switchMap((channelId: string) =>
            conversations.listLinks(channelId).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessagingLinkOutput>): void =>
                  patchState(store, { linksCallState: successCallState([...collection.member]) }),
                error: (error: unknown): void =>
                  patchState(store, { linksCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      );

      /** Fetches the collection behind a tab, once. */
      function loadTab(tab: ChannelPanelTab, channelId: string): void {
        switch (tab) {
          case 'pins':
            if (store.pinsCallState().status === 'idle') loadPins(channelId);
            return;
          case 'files':
            if (store.filesCallState().status === 'idle') loadFiles(channelId);
            return;
          case 'links':
            if (store.linksCallState().status === 'idle') loadLinks(channelId);
            return;
          default:
            return;
        }
      }

      return {
        /**
         * Points the panel at a channel, resetting the per-channel reads.
         *
         * The tab returns to Info because Pins/Files/Links belong to the
         * channel that was left, and keeping the tab would show a stale list
         * under a new title.
         */
        open(context: ChannelRouteContext): void {
          if (store.loadedChannelId() === context.channelId) return;

          patchState(store, {
            loadedChannelId: context.channelId,
            activeTab: 'info',
            pinsCallState: idleCallState(),
            filesCallState: idleCallState(),
            linksCallState: idleCallState(),
          });

          loadChannel(context.channelId);
          loadParticipants(context.channelId);
          loadActivity(context.channelId);

          if (store.loadedOrganizationId() !== context.organizationId) {
            loadSiblings(context.organizationId);
          }
        },

        /** Switches tab, fetching its collection the first time it is shown. */
        setTab(tab: ChannelPanelTab): void {
          patchState(store, { activeTab: tab });

          const channelId: string | null = store.channelId();

          if (channelId !== null) loadTab(tab, channelId);
        },

        /** Re-runs the current tab's failed read. */
        retryTab(): void {
          const channelId: string | null = store.channelId();

          if (channelId === null) return;

          switch (store.activeTab()) {
            case 'pins':
              loadPins(channelId);
              return;
            case 'files':
              loadFiles(channelId);
              return;
            case 'links':
              loadLinks(channelId);
              return;
            default:
              loadParticipants(channelId);
              return;
          }
        },
      };
    },
  ),

  withHooks((store) => ({
    onInit(): void {
      const route: Signal<ChannelRouteContext | null> = store._route;

      // Navigation is the only trigger: the panel has no owner to call it.
      rxMethod<ChannelRouteContext | null>(
        tap((context: ChannelRouteContext | null): void => {
          if (context !== null) store.open(context);
        }),
      )(route);
    },
  })),
);

/**
 * Type ChannelPanelStoreType
 *
 * @description
 * Injection type of {@link ChannelPanelStore}.
 *
 * @since 1.0.0
 */
export type ChannelPanelStoreType = InstanceType<typeof ChannelPanelStore>;
