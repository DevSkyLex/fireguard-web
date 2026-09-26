import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  Service,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { pageVisibility } from '@signality/core';
import { ConnectivityService } from '@core/connectivity';
import { MercureService } from '@core/mercure';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { PresencePreferenceStore } from '@features/account/state/presence-preference';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';

/**
 * Service PresencePreferenceCoordinatorService
 * @class PresencePreferenceCoordinatorService
 * @description Browser-only preference refresh and private realtime lifetime. All effects stop
 * on hidden/offline/session changes; a failed token renewal preserves the current socket.
 * @since 1.0.0
 */
@Service()
export class PresencePreferenceCoordinatorService {
  /**
   * Property store
   * @readonly
   * @description Account-owned canonical preference and request operations.
   * @access private
   * @since 1.0.0
   * @type {PresencePreferenceStore}
   */
  private readonly store: PresencePreferenceStore = inject(PresencePreferenceStore);

  /**
   * Property session
   * @readonly
   * @description Auth session boundary, independent of bearer rotation.
   * @access private
   * @since 1.0.0
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property identity
   * @readonly
   * @description A confirmed profile is required before any account presence request.
   * @access private
   * @since 1.0.0
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);

  /**
   * Property connectivity
   * @readonly
   * @description Shared browser network state.
   * @access private
   * @since 1.0.0
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property mercure
   * @readonly
   * @description Existing ref-counted private realtime transport.
   * @access private
   * @since 1.0.0
   * @type {MercureService}
   */
  private readonly mercure: MercureService = inject(MercureService);

  /**
   * Property visibility
   * @readonly
   * @description SSR-safe visible-document signal.
   * @access private
   * @since 1.0.0
   * @type {Signal<DocumentVisibilityState>}
   */
  private readonly visibility: Signal<DocumentVisibilityState> = pageVisibility();

  /**
   * Constructor
   * @constructor
   * @description Starts hydration-gated effects once from the account root provider.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const hydrated = signal(false);
    afterNextRender(() => hydrated.set(true));

    effect((onCleanup) => {
      const revision = this.session.sessionRevision();
      const active =
        browser &&
        hydrated() &&
        this.session.isAuthenticated() &&
        !!this.identity.profile() &&
        this.connectivity.online() &&
        this.visibility() === 'visible';
      untracked(() => {
        this.store.setContext(revision, active);
        if (!active) return;
        this.store.load();
        this.store.subscribe();
        const timer = setInterval(() => {
          this.store.load();
          const state = this.store.subscriptionCallState();
          if (state.status !== 'pending' && (!state.data || state.status === 'error')) {
            this.store.subscribe();
          }
        }, 45_000);
        onCleanup(() => clearInterval(timer));
      });
    });

    const authorization = computed(() => this.store.subscriptionCallState().data);
    effect((onCleanup) => {
      const revision = this.session.sessionRevision();
      const active = this.store.active();
      const subscription = authorization();
      if (!active || !subscription) return;
      const expiresAt = Date.parse(subscription.expiresAt);
      if (!Number.isFinite(expiresAt)) return;
      const stream = this.mercure
        .subscribe<unknown>(subscription.topic, subscription.token)
        .subscribe((frame) => this.store.applyRealtime(frame, revision));
      const timer = setTimeout(
        () => this.store.subscribe(),
        Math.max(1_000, expiresAt - Date.now() - 30_000),
      );
      onCleanup(() => {
        clearTimeout(timer);
        stream.unsubscribe();
      });
    });

    const connected = computed(() => {
      const topic = this.store.subscriptionCallState().data?.topic;
      return this.store.active() && !!topic && this.mercure.isConnected(topic);
    });
    effect(() => {
      if (connected()) untracked(() => this.store.load());
    });
  }
}
