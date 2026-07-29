import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import {
  AUTH_LOGOUT_PORT,
  AUTH_SESSION_PORT,
  type AuthLogoutPort,
  type AuthSessionPort,
} from '@features/auth/ports';
import {
  resolveInvitationTag,
  type OrganizationInvitationStatus,
} from '@features/organization/models';
import { OrganizationInvitationAcceptStore } from '@features/organization/state/organization-invitation-accept';
import { Tag } from '@shared/components';
import type { TagDescriptor } from '@shared/components';

/**
 * Page OrganizationInvitationAcceptPage
 *
 * @description
 * Public landing page for an invitation link. Loads a token preview, then:
 * accepts automatically for an authenticated, matching user; guides a
 * mismatched user to switch accounts; and offers sign-in / sign-up (carrying a
 * `returnUrl` back here) for an unauthenticated visitor.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-accept',
  imports: [ButtonModule, CardModule, DatePipe, MessageModule, SkeletonModule, Tag],
  providers: [OrganizationInvitationAcceptStore],
  templateUrl: './organization-invitation-accept.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationAcceptPage {
  /** Active route containing the invitation token query parameter. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Router used for auth redirects and post-acceptance navigation. */
  private readonly router: Router = inject<Router>(Router);
  /** Auth session port (authentication state + sign-out). */
  private readonly session: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

  /**
   * Property logoutPort
   * @readonly
   *
   * @description
   * Auth-owned logout contract, used to end the current session properly when the
   * invitee turns out to be signed in as somebody else.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {AuthLogoutPort}
   */
  private readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);
  /** User identity port used to compare the signed-in email with the invite. */
  private readonly identity: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);
  /** Page-scoped invitation acceptance store. */
  protected readonly store: OrganizationInvitationAcceptStore = inject(
    OrganizationInvitationAcceptStore,
  );

  /** Invitation token extracted from the current URL. */
  protected readonly token: string = this.route.snapshot.queryParamMap.get('token') ?? '';

  /** Whether a user session is active. */
  protected readonly isAuthenticated: Signal<boolean> = this.session.isAuthenticated;
  /** Email of the signed-in user, when known. */
  protected readonly currentEmail: Signal<string | null> = computed(
    () => this.identity.profile()?.email ?? null,
  );
  /** Email the invitation was addressed to. */
  protected readonly invitedEmail: Signal<string | null> = computed(
    () => this.store.preview()?.invitedEmail ?? null,
  );
  /** Effective status of the previewed invitation. */
  protected readonly status: Signal<OrganizationInvitationStatus | null> = computed(
    () => this.store.preview()?.status ?? null,
  );
  /** Whether the previewed invitation is still pending (acceptable). */
  protected readonly isPending: Signal<boolean> = computed(() => this.status() === 'pending');
  /**
   * Why a non-pending invitation cannot be accepted, in the invitee's terms.
   *
   * Each dead end calls for a different move — ask for a new link, sign in,
   * or nothing at all — so they do not share one message. `expired` is
   * resolved server-side, hence no date comparison here.
   */
  protected readonly blockedReason: Signal<string | null> = computed((): string | null => {
    switch (this.status()) {
      case 'expired':
        return $localize`:@@org.invAccept.expired:This invitation has expired. Ask an organization administrator to send you a new one.`;
      case 'revoked':
        return $localize`:@@org.invAccept.revoked:This invitation was revoked. Ask an organization administrator if you think this is a mistake.`;
      case 'accepted':
        return $localize`:@@org.invAccept.alreadyAccepted:This invitation has already been accepted. Sign in to open the workspace.`;
      default:
        return null;
    }
  });

  /** Deadline shown while the invitation can still be accepted. */
  protected readonly expiresAt: Signal<string | null> = computed(() =>
    this.isPending() ? (this.store.preview()?.expiresAt ?? null) : null,
  );

  /** Presentation descriptor for the invitation status badge. */
  protected readonly statusDescriptor: Signal<TagDescriptor | null> = computed(() => {
    const status = this.status();
    return status ? resolveInvitationTag('invitationStatus', status) : null;
  });

  /**
   * Whether the signed-in account differs from the invited email. Only
   * decisive once both emails are known; otherwise the backend remains the
   * source of truth on acceptance.
   */
  protected readonly emailMismatch: Signal<boolean> = computed(() => {
    const current = this.currentEmail();
    const invited = this.invitedEmail();
    return (
      this.isAuthenticated() &&
      current !== null &&
      invited !== null &&
      current.trim().toLowerCase() !== invited.trim().toLowerCase()
    );
  });

  /** Guards the auto-accept effect so it fires at most once. */
  private autoAccepted = false;
  /** Whether the page runs in the browser (avoids SSR-side fetch/mutation). */
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /** Loads the preview and wires the auto-accept effect (browser-only). */
  public constructor() {
    if (this.isBrowser && this.token) {
      this.store.loadPreview(this.token);
    }

    effect(() => {
      if (
        this.isBrowser &&
        !this.autoAccepted &&
        this.token !== '' &&
        this.isAuthenticated() &&
        this.isPending() &&
        !this.emailMismatch() &&
        !this.store.isAccepting() &&
        !this.store.isAccepted() &&
        !this.store.isAcceptError()
      ) {
        this.autoAccepted = true;
        this.store.accept(this.token);
      }
    });
  }

  /** Accepts the invitation for the signed-in user. */
  protected accept(): void {
    if (this.token) this.store.accept(this.token);
  }

  /** Redirects to sign-in, returning to this page afterwards. */
  protected signIn(): void {
    this.router
      .navigate(['/auth/login'], { queryParams: { returnUrl: this.returnUrl() } })
      .catch(() => undefined);
  }

  /** Redirects to sign-up, returning to this page afterwards. */
  protected register(): void {
    this.router
      .navigate(['/auth/register'], {
        queryParams: { returnUrl: this.returnUrl(), email: this.invitedEmail() ?? undefined },
      })
      .catch(() => undefined);
  }

  /**
   * Ends the current session and sends the user to sign in as someone else.
   *
   * Goes through the real logout rather than clearing locally: only the server can
   * revoke the `refresh_token` cookie, and it is `HttpOnly`, so a local clear left
   * the previous member's session resurrectable from this very browser. On a
   * shared field device that is somebody else's account left unlocked.
   *
   * Navigation does not wait for the response — the request is already in flight
   * and the local state is dropped synchronously, so the sign-in page is correct
   * either way.
   */
  protected switchAccount(): void {
    this.logoutPort.logout();
    this.router
      .navigate(['/auth/login'], { queryParams: { returnUrl: this.returnUrl() } })
      .catch(() => undefined);
  }

  /**
   * Navigates to the joined organization when the invitation was accepted,
   * otherwise to the default organization workspace.
   */
  protected goToWorkspace(): void {
    const organizationId: string | null = this.store.preview()?.organizationId ?? null;
    const target: ReadonlyArray<string> =
      this.store.isAccepted() && organizationId ? ['/organizations', organizationId] : ['/'];
    this.router.navigate([...target]).catch(() => undefined);
  }

  /** Builds the absolute internal return path back to this invitation. */
  private returnUrl(): string {
    return `/organizations/invitations/accept?token=${encodeURIComponent(this.token)}`;
  }
}
