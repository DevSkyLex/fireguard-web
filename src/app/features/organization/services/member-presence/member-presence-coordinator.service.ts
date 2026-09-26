import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  PLATFORM_ID,
  Service,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConnectivityService } from '@core/connectivity';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  PRESENCE_PING_INTERVAL_MS,
  PRESENCE_POLL_INTERVAL_MS,
} from '@features/organization/constants/presence';
import { ORGANIZATION_PERMISSION, type PresenceStatus } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type MemberPresencePort,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import {
  MemberPresenceStore,
  type MemberPresenceStoreType,
} from '@features/organization/state/member-presence';

/**
 * Service MemberPresenceCoordinatorService
 * @class MemberPresenceCoordinatorService
 * @description Starts presence after hydration independently of shell widgets. Registrations are keyed by
 * consumer and organization, so opening a second surface cannot overwrite the first one's watched members.
 * @since 1.0.0
 */
@Service()
export class MemberPresenceCoordinatorService implements MemberPresencePort {
  /**
   * Property store
   * @readonly
   * @description Shared snapshots, requests and connection lifecycle.
   * @access private
   * @since 1.0.0
   * @type {MemberPresenceStoreType}
   */
  private readonly store: MemberPresenceStoreType = inject(MemberPresenceStore);
  /**
   * Property context
   * @readonly
   * @description Selected organization published by its owner.
   * @access private
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  private readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
  /**
   * Property access
   * @readonly
   * @description Verified active membership for the selected organization.
   * @access private
   * @since 1.0.0
   * @type {OrganizationMemberAccessPort}
   */
  private readonly access: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);
  /**
   * Property permissions
   * @readonly
   * @description Presence read authorization, independent of heartbeat authorization.
   * @access private
   * @since 1.0.0
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property session
   * @readonly
   * @description Authenticated session identity and revision.
   * @access private
   * @since 1.0.0
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);
  /**
   * Property connectivity
   * @readonly
   * @description Browser network availability.
   * @access private
   * @since 1.0.0
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  /**
   * Property document
   * @readonly
   * @description Injected document for visibility events.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);
  /**
   * Property destroyRef
   * @readonly
   * @description Lifetime for browser listeners and timers.
   * @access private
   * @since 1.0.0
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  /**
   * Property browser
   * @readonly
   * @description Prevents browser work in server contexts.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * Property ready
   * @readonly
   * @description Hydration completion gate.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly ready: WritableSignal<boolean> = signal(false);
  /**
   * Property visible
   * @readonly
   * @description Whether the browser document is visible.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly visible: WritableSignal<boolean> = signal(false);
  /**
   * Property registrations
   * @readonly
   * @description References owned independently by each currently rendered surface.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<ReadonlyMap<object, { organization: string | null; ids: readonly string[] }>>}
   */
  private readonly registrations: WritableSignal<
    ReadonlyMap<object, { organization: string | null; ids: readonly string[] }>
  > = signal(new Map());

  /**
   * Property byId
   * @readonly
   * @description Fresh confirmed member statuses in the selected organization.
   * @access public
   * @since 1.0.0
   * @type {Signal<Readonly<Record<string, PresenceStatus>>>}
   */
  public readonly byId: Signal<Readonly<Record<string, PresenceStatus>>> = this.store.byId;

  /**
   * Property ownStatus
   * @readonly
   * @description Acknowledged availability of the signed-in member.
   * @access public
   * @since 1.0.0
   * @type {Signal<PresenceStatus | null>}
   */
  public readonly ownStatus: Signal<PresenceStatus | null> = this.store.ownStatus;

  /**
   * Property active
   * @readonly
   * @description Whether browser exchanges may run now.
   * @access private
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  private readonly active: Signal<boolean> = computed(
    () =>
      this.ready() &&
      this.visible() &&
      this.connectivity.online() &&
      this.session.isAuthenticated(),
  );

  /**
   * Constructor
   * @constructor
   * @description Wires browser-only lifecycle listeners and cancels every timer on scope teardown.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    let registrationSession = this.session.sessionRevision();
    afterNextRender(() => {
      if (!this.browser) return;
      const updateVisibility = (): void => {
        this.visible.set(this.document.visibilityState === 'visible');
      };
      updateVisibility();
      this.document.addEventListener('visibilitychange', updateVisibility);
      this.ready.set(true);
      this.destroyRef.onDestroy(() =>
        this.document.removeEventListener('visibilitychange', updateVisibility),
      );
    });
    effect(() => {
      const profile = this.access.profile();
      const selected = this.context.selectedOrganizationId();
      const sessionRevision = this.session.sessionRevision();
      const organization =
        this.session.isAuthenticated() && profile?.isActive && profile.organizationId === selected
          ? selected
          : null;
      const canRead = this.permissions.hasAnyPermission([
        ORGANIZATION_PERMISSION.MEMBERS_READ,
        ORGANIZATION_PERMISSION.MESSAGING_READ,
      ]);
      const active = this.active();
      untracked(() => {
        if (sessionRevision !== registrationSession) {
          registrationSession = sessionRevision;
          this.registrations.set(new Map());
        }
        this.store.configure(organization, sessionRevision, canRead);
        if (active && organization) this.store.resume();
        else this.store.pause();
      });
    });
    effect(() => {
      const organization = this.store.organizationId();
      const ownId = this.store.ownMemberId();
      this.store.sessionRevision();
      this.store.canRead();
      const ids = [...this.registrations().values()]
        .filter((registration) => registration.organization === organization)
        .flatMap((registration) => registration.ids);
      if (ownId) ids.push(ownId);
      untracked(() => this.store.watch(ids));
    });
    effect((onCleanup) => {
      if (!this.active() || !this.store.running()) return;
      const pingTimer = setInterval(() => this.store.ping(), PRESENCE_PING_INTERVAL_MS);
      const pollTimer = setInterval(() => this.store.refresh(), PRESENCE_POLL_INTERVAL_MS);
      const freshnessTimer = setInterval(() => this.store.tick(), 1_000);
      onCleanup(() => {
        clearInterval(pingTimer);
        clearInterval(pollTimer);
        clearInterval(freshnessTimer);
      });
    });
    this.destroyRef.onDestroy(() => this.store.pause());
  }

  /**
   * Method register
   * @method register
   * @description Replaces one surface's references in the currently selected organization.
   * @access public
   * @since 1.0.0
   * @param {object} owner - Stable consumer identity.
   * @param {readonly string[]} memberIds - Members currently rendered by this consumer.
   * @returns {void}
   */
  public register(owner: object, memberIds: readonly string[]): void {
    const organization = this.context.selectedOrganizationId();
    const current = untracked(this.registrations);
    const previous = current.get(owner);
    if (previous?.organization === organization && previous.ids.join(',') === memberIds.join(','))
      return;
    const next = new Map(current);
    next.set(owner, { organization, ids: [...memberIds] });
    this.registrations.set(next);
  }

  /**
   * Method unregister
   * @method unregister
   * @description Releases only the closing consumer's members.
   * @access public
   * @since 1.0.0
   * @param {object} owner - Consumer identity used during registration.
   * @returns {void}
   */
  public unregister(owner: object): void {
    const next = new Map(untracked(this.registrations));
    next.delete(owner);
    this.registrations.set(next);
  }
}
