import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  type Signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideClock3, lucideCircleAlert } from '@ng-icons/lucide';
import { map, of, Subject, switchMap } from 'rxjs';
import { NOTIFICATION_CENTER_PORT } from '@features/account';
import { OtpForm } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';
import { WorkspaceStore, OnboardingStore } from '@features/onboarding/state';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { OrganizationLandingService } from '@features/organization/services/organization-landing';
import { getOrganizationInitials } from '@features/organization/utils';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmLarge, HlmMuted } from '@shared/ui/typography';
/**
 * Component OnboardingWorkspacePage
 * @class OnboardingWorkspacePage
 *
 * @description
 * Orchestrates explicit workspace selection and owned request tracking in the auth split shell.
 * Mailbox challenges and private discovery load browser-side and never enter the hydration payload.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-onboarding-workspace-page',
  imports: [
    RouterLink,
    DatePipe,
    NgIcon,
    OtpForm,
    HlmButton,
    HlmItemImports,
    HlmEmptyImports,
    HlmAvatarImports,
    HlmBadge,
    HlmSkeleton,
    HlmLarge,
    HlmMuted,
    ResourceIllustration,
  ],
  providers: [WorkspaceStore, provideIcons({ lucideMail, lucideClock3, lucideCircleAlert })],
  templateUrl: './onboarding-workspace-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWorkspacePage {
  /**
   * Property landing
   * @readonly
   *
   * @description
   * Resolves default destinations using target organization API permissions.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationLandingService}
   */
  private readonly landing: OrganizationLandingService = inject(OrganizationLandingService);

  /**
   * Property organizationNavigation
   * @readonly
   *
   * @description
   * Latest explicit workspace selection wins while target permissions are loading.
   *
   * @access private
   * @since unreleased
   *
   * @type {Subject<{ organizationId: string; replaceUrl: boolean }>}
   */
  private readonly organizationNavigation: Subject<{
    organizationId: string;
    replaceUrl: boolean;
  }> = new Subject();

  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped commands and private choices.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkspaceStore}
   */
  protected readonly store: WorkspaceStore = inject(WorkspaceStore);
  /**
   * Property onboarding
   * @readonly
   *
   * @description
   * Existing creation remains resumable when choosing another workspace.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OnboardingStore}
   */
  protected readonly onboarding: OnboardingStore = inject(OnboardingStore);
  /**
   * Property host
   * @readonly
   *
   * @description
   * Focuses the active proof form or the result heading after user actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  /**
   * Property router
   * @readonly
   *
   * @description
   * Application navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  /**
   * Property route
   * @readonly
   *
   * @description
   * Validated incoming destination and display mode.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /**
   * Property requestsOnly
   * @readonly
   *
   * @description
   * Indicates the dedicated request-tracking route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {boolean}
   */
  protected readonly requestsOnly: boolean = this.route.snapshot.data['requestsOnly'] === true;
  /**
   * Property destination
   * @readonly
   *
   * @description
   * Only the safe return destination is propagated between workflow pages.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly destination: string = resolveReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
    '',
  );
  /**
   * Property hasRequests
   * @readonly
   *
   * @description
   * Whether the current account has request history.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasRequests: Signal<boolean> = computed(
    () => (this.store.options()?.requests.length ?? 0) > 0,
  );
  /**
   * Property isOrganizationsEmpty
   * @readonly
   *
   * @description
   * Whether the "no organization available" empty state is the one being rendered, so its Create
   * action moves into it and the footer's copy hides.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isOrganizationsEmpty: Signal<boolean> = computed(() => {
    const options = this.store.options();
    return (
      !this.requestsOnly &&
      options !== null &&
      !options.emailProofRequired &&
      options.organizations.length === 0 &&
      options.invitations.length === 0 &&
      !this.store.optionsCallState().error
    );
  });
  /**
   * Property isRequestsEmpty
   * @readonly
   *
   * @description
   * Whether the "no membership requests" empty state is the one being rendered, so its
   * Choose-a-workspace action moves into it and the footer's copy hides.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isRequestsEmpty: Signal<boolean> = computed(
    () =>
      this.requestsOnly &&
      this.store.options() !== null &&
      !this.hasRequests() &&
      !this.store.optionsCallState().error,
  );
  /**
   * Property getOrganizationInitials
   * @readonly
   *
   * @description
   * Template-bound reference to the shared organization initials util, used for a logo-less avatar
   * fallback.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {typeof getOrganizationInitials}
   */
  protected readonly getOrganizationInitials: typeof getOrganizationInitials =
    getOrganizationInitials;
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads private choices after hydration and navigates only after confirmed admission.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const notifications = inject(NOTIFICATION_CENTER_PORT);
    this.organizationNavigation
      .pipe(
        switchMap(({ organizationId, replaceUrl }) => {
          const explicit: string | null = this.organizationDestination(organizationId);
          return (explicit ? of(explicit) : this.landing.defaultDestination(organizationId)).pipe(
            map((destination) => ({ destination, replaceUrl })),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(({ destination, replaceUrl }) => {
        if (replaceUrl) void this.router.navigateByUrl(destination, { replaceUrl: true });
        else void this.router.navigateByUrl(destination);
      });
    afterNextRender(() => {
      this.store.load();
      notifications.connectMercure();
    });
    let focusedChallenge: string | null = null;
    let completedAction: object | null = null;
    afterRenderEffect(() => {
      const challenge = this.store.challengeCallState().data?.challengeToken ?? null;
      const result =
        this.store.confirmCallState().data ??
        this.store.requestCallState().data ??
        this.store.cancelCallState().data;
      if (challenge && challenge !== focusedChallenge) {
        this.host.nativeElement.querySelector<HTMLInputElement>('app-otp-form input')?.focus();
      } else if (result && result !== completedAction) {
        this.host.nativeElement.querySelector<HTMLElement>('[data-workspace-heading]')?.focus();
      }
      focusedChallenge = challenge;
      completedAction = result;
    });
    let revision = notifications.revision();
    effect(() => {
      const nextRevision = notifications.revision();
      if (nextRevision > revision) untracked(() => this.store.load());
      revision = nextRevision;
    });
    effect(() => {
      if (!this.store.createCallState().data) return;
      this.onboarding.clear();
      void this.router.navigate(['/onboarding/create'], {
        queryParams: { returnUrl: this.destination || undefined },
      });
    });
    effect(() => {
      const result = this.store.admissionCallState().data;
      if (!result) return;
      untracked(() =>
        this.organizationNavigation.next({
          organizationId: result.organizationId,
          replaceUrl: true,
        }),
      );
    });
  }
  /**
   * Method organizationDestination
   *
   * @description
   * Retains a safe deep link in the selected organization; guards still enforce permissions.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Server-authorized organization.
   *
   * @returns {string | null} Explicit local destination, otherwise a permission-gated default is
   *   needed.
   */
  private organizationDestination(organizationId: string): string | null {
    const root = '/organizations/' + encodeURIComponent(organizationId);
    return this.destination === root ||
      this.destination.startsWith(root + '/') ||
      this.destination.startsWith(root + '?')
      ? this.destination
      : null;
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens an already accessible organization, causing guards to refresh activation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} organizationId - Server-authorized organization.
   *
   * @returns {void} Starts navigation.
   */
  protected open(organizationId: string): void {
    this.onboarding.clear();
    this.organizationNavigation.next({ organizationId, replaceUrl: false });
  }
  /**
   * Method statusLabel
   * @method statusLabel
   *
   * @description
   * Localizes request lifecycle states without exposing raw API values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationJoinRequestOutput['status']} status - Request lifecycle state.
   *
   * @returns {string} Localized status.
   */
  protected statusLabel(status: OrganizationJoinRequestOutput['status']): string {
    switch (status) {
      case 'pending':
        return $localize`:@@onboarding.workspace.pending:Awaiting approval`;
      case 'approved':
        return $localize`:@@onboarding.workspace.approved:Approved`;
      case 'rejected':
        return $localize`:@@onboarding.workspace.rejected:Declined`;
      case 'cancelled':
        return $localize`:@@onboarding.workspace.cancelled:Cancelled`;
      case 'expired':
        return $localize`:@@onboarding.workspace.expired:Expired`;
    }
  }
}
