import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { ConnectivityService } from '@core/connectivity';
import { PresenceService as PresenceApi } from '@features/collaboration/data-access';
import type { PresenceOutput } from '@features/collaboration/models';
import {
  PRESENCE_PING_BACKOFF_MS,
  PRESENCE_PING_INTERVAL_MS,
  PRESENCE_POLL_INTERVAL_MS,
} from './constants';
import { chunkMemberIds } from './utils';

/**
 * Service MemberPresenceService
 * @class MemberPresenceService
 *
 * @description
 * Who is currently around, and telling the server that we are.
 *
 * Presence is poll-only: nothing pushes it, no Mercure topic carries it, and
 * the server keeps it in a cache that forgets a member after 90 seconds. Two
 * timers are therefore the whole feature — one announcing us, one asking about
 * everyone else.
 *
 * Both stop when the tab is hidden or the browser is offline. That is not
 * politeness: the ping endpoint allows 6 requests per minute per user and
 * organization, and a member with four background tabs would otherwise spend
 * the whole budget saying nothing new.
 *
 * The organization is a **parameter**, not something read from a port: this is
 * root-provided and `ORGANIZATION_CONTEXT_PORT` is bound by the workspace
 * route, which a root injector cannot see.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MemberPresenceService {
  //#region Properties
  /**
   * Property api
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PresenceApi}
   */
  private readonly api: PresenceApi = inject(PresenceApi);

  /**
   * Property connectivity
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property browser
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Injected as a field, not inside `start()`: `inject()` outside an injection
   * context throws `NG0203`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property presences
   * @readonly
   *
   * @description
   * Backing signal of {@link byId}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<ReadonlyMap<string, PresenceOutput>>}
   */
  private readonly presences: WritableSignal<ReadonlyMap<string, PresenceOutput>> = signal<
    ReadonlyMap<string, PresenceOutput>
  >(new Map<string, PresenceOutput>());

  /**
   * Property byId
   * @readonly
   *
   * @description
   * Presence of every tracked member, keyed by bare member id. A member with
   * no entry has not been asked about.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyMap<string, PresenceOutput>>}
   */
  public readonly byId: Signal<ReadonlyMap<string, PresenceOutput>> = this.presences.asReadonly();

  /** Organization currently tracked, or `null`. */
  private organizationId: string | null = null;

  /** Member references currently tracked. */
  private tracked: readonly string[] = [];

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /** Epoch millis before which pinging stays paused after a `429`. */
  private pingPausedUntil = 0;

  /** Whether {@link start} already ran. */
  private started = false;
  //#endregion

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Begins announcing the member and polling the tracked set. Idempotent, and
   * a no-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization IRI or bare UUID.
   *
   * @return {void}
   */
  public start(organizationId: string): void {
    if (!this.browser) return;

    this.organizationId = organizationId;

    if (this.started) return;
    this.started = true;

    this.pingTimer = setInterval((): void => this.ping(), PRESENCE_PING_INTERVAL_MS);
    this.pollTimer = setInterval((): void => void this.poll(), PRESENCE_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.destroyRef.onDestroy((): void => this.stop());

    this.ping();
    void this.poll();
  }

  /**
   * Method track
   * @method track
   *
   * @description
   * Replaces the set of members whose presence is wanted, and reads it now.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {readonly string[]} memberRefs - Bare member ids or member IRIs.
   *
   * @return {void}
   */
  public track(memberRefs: readonly string[]): void {
    this.tracked = memberRefs;

    void this.poll();
  }

  /**
   * Method isOnline
   * @method isOnline
   *
   * @description
   * Whether a member is currently around. Unknown members read as offline —
   * the server draws the same conclusion for anyone it has not heard from.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} memberRef - Bare member id or member IRI.
   *
   * @return {boolean} `true` only for a member seen in the last 90 seconds.
   */
  public isOnline(memberRef: string): boolean {
    const memberId: string = memberRef.slice(memberRef.lastIndexOf('/') + 1);

    return this.byId().get(memberId)?.online === true;
  }

  /**
   * Method stop
   * @method stop
   *
   * @description
   * Stops both timers and forgets what was read.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public stop(): void {
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    this.pingTimer = null;
    this.pollTimer = null;
    this.started = false;

    if (this.browser) document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.presences.set(new Map<string, PresenceOutput>());
  }
  //#endregion

  //#region Internals
  /**
   * Announces the member, unless we are hidden, offline, or paused after a
   * rate limit.
   */
  private ping(): void {
    if (!this.active() || Date.now() < this.pingPausedUntil) return;

    const organizationId: string | null = this.organizationId;

    if (organizationId === null) return;

    void firstValueFrom(this.api.ping({ organization: organizationId })).catch(
      (error: unknown): void => {
        // Being rate-limited means other tabs are already announcing us, so
        // the useful response is to stop competing.
        if (isApiError(error) && error.status === 429) {
          this.pingPausedUntil = Date.now() + PRESENCE_PING_BACKOFF_MS;
        }
      },
    );
  }

  /**
   * Reads the tracked set, in batches the endpoint accepts.
   */
  private async poll(): Promise<void> {
    if (!this.active()) return;

    const organizationId: string | null = this.organizationId;

    if (organizationId === null || this.tracked.length === 0) return;

    const batches: readonly (readonly string[])[] = chunkMemberIds(this.tracked);

    try {
      const responses = await Promise.all(
        batches.map((memberIds: readonly string[]) =>
          firstValueFrom(this.api.list({ organization: organizationId, memberIds })),
        ),
      );

      const next = new Map<string, PresenceOutput>();

      for (const collection of responses) {
        for (const presence of collection.member) {
          next.set(presence.memberId, presence);
        }
      }

      this.presences.set(next);
    } catch {
      // Presence is decoration: a failed read leaves the last known picture
      // rather than blanking every avatar.
    }
  }

  /** Whether it is worth spending a request right now. */
  private active(): boolean {
    return this.browser && this.connectivity.online() && document.visibilityState === 'visible';
  }

  /** Catches up as soon as the tab is looked at again. */
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') return;

    this.ping();
    void this.poll();
  };
  //#endregion
}
