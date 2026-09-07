import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ElementRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type Signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideMail, lucideClock3 } from '@ng-icons/lucide';
import { NOTIFICATION_CENTER_PORT } from '@features/account';
import { OtpForm } from '@features/auth/ui/forms';
import { resolveReturnUrl } from '@features/auth/utils';
import { WorkspaceStore, OnboardingStore } from '@features/onboarding/state';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinner } from '@shared/ui/spinner';

import { HlmAvatarImports } from '@shared/ui/avatar';
/**
 * Component OnboardingWorkspacePage
 * @class OnboardingWorkspacePage
 * @description Orchestrates explicit workspace selection and owned request tracking in the auth split shell.
 * Mailbox challenges and private discovery load browser-side and never enter the hydration payload.
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
    HlmAlertImports,
    HlmSpinner,
    HlmAvatarImports,
  ],
  providers: [WorkspaceStore, provideIcons({ lucideBuilding2, lucideMail, lucideClock3 })],
  templateUrl: './onboarding-workspace-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWorkspacePage {
  /** Property store
   * @readonly
   * @description Page-scoped commands and private choices.
   * @access protected
   * @since 1.0.0
   * @type {WorkspaceStore}
   */
  protected readonly store: WorkspaceStore = inject(WorkspaceStore);
  /** Property onboarding
   * @readonly
   * @description Existing creation remains resumable when choosing another workspace.
   * @access protected
   * @since 1.0.0
   * @type {OnboardingStore}
   */
  protected readonly onboarding: OnboardingStore = inject(OnboardingStore);
  /** Property host
   * @readonly
   * @description Focuses the active proof form or the result heading after user actions.
   * @access private
   * @since 1.0.0
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  /** Property router
   * @readonly
   * @description Application navigation.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  /** Property route
   * @readonly
   * @description Validated incoming destination and display mode.
   * @access private
   * @since 1.0.0
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /** Property requestsOnly
   * @readonly
   * @description Indicates the dedicated request-tracking route.
   * @access protected
   * @since 1.0.0
   * @type {boolean}
   */
  protected readonly requestsOnly: boolean = this.route.snapshot.data['requestsOnly'] === true;
  /** Property destination
   * @readonly
   * @description Only the safe return destination is propagated between workflow pages.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly destination: string = resolveReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
    '',
  );
  /** Property hasRequests
   * @readonly
   * @description Whether the current account has request history.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasRequests: Signal<boolean> = computed(
    () => (this.store.options()?.requests.length ?? 0) > 0,
  );
  /** Constructor
   * @constructor
   * @description Loads private choices after hydration and navigates only after confirmed admission.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const notifications = inject(NOTIFICATION_CENTER_PORT);
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
      void this.router.navigateByUrl(this.organizationDestination(result.organizationId), {
        replaceUrl: true,
      });
    });
  }
  /**
   * Method organizationDestination
   * @description Retains a safe deep link in the selected organization; guards still enforce permissions.
   * @access private
   * @since 1.0.0
   * @param {string} organizationId - Server-authorized organization.
   * @returns {string} Local destination.
   */
  private organizationDestination(organizationId: string): string {
    const root = '/organizations/' + encodeURIComponent(organizationId);
    return this.destination === root ||
      this.destination.startsWith(root + '/') ||
      this.destination.startsWith(root + '?')
      ? this.destination
      : root;
  }

  /** Method open
   * @method open
   * @description Opens an already accessible organization, causing guards to refresh activation state.
   * @access protected
   * @since 1.0.0
   * @param {string} organizationId - Server-authorized organization.
   * @returns {void} Starts navigation.
   */
  protected open(organizationId: string): void {
    this.onboarding.clear();
    void this.router.navigateByUrl(this.organizationDestination(organizationId));
  }
  /** Method statusLabel
   * @method statusLabel
   * @description Localizes request lifecycle states without exposing raw API values.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationJoinRequestOutput['status']} status - Request lifecycle state.
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
