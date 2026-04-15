import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MessageService } from 'primeng/api';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { OnboardingStore } from '@features/onboarding/state';
import { InviteMembersForm, type InviteMembersFormValues } from '@features/onboarding/ui/forms';
import {
  OrganizationSetupService,
  type SetupOrganizationRole,
} from '@features/organization/setup';
import { OnboardingStepBase } from '../onboarding-step.base';

/**
 * Component InviteMembersStep
 * @class InviteMembersStep
 *
 * @description
 * Onboarding step for inviting members to the organization.
 * Loads available roles and sends invitations via the OrganizationInvitationService.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-invite-members-step',
  imports: [CardModule, TagModule, InviteMembersForm],
  templateUrl: './invite-members-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteMembersStep extends OnboardingStepBase {
  //#region Properties
  /**
   * Property onboardingStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OnboardingStore}
   */
  private readonly onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Property roleListStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationRoleListStore}
   */
  private readonly organizationSetupService: OrganizationSetupService =
    inject<OrganizationSetupService>(OrganizationSetupService);

  /**
   * Property messageService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);
  //#endregion

  //#region State
  /**
   * Property isInviting
   * @readonly
   *
   * @description
   * Whether the invitation API calls are in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly isInviting: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isExecuting
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isExecuting: Signal<boolean> = this.onboardingStore.isExecutingStep;

  /**
   * Property isSkipping
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isSkipping: Signal<boolean> = this.onboardingStore.isSkippingStep;

  /**
   * Property isBusy
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isBusy: Signal<boolean> = this.onboardingStore.isBusy;

  /**
   * Property anyBusy
   * @readonly
   *
   * @description
   * Combined busy flag including both onboarding store and local invitation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly anyBusy: Signal<boolean> = computed<boolean>(
    () => this.isBusy() || this.isInviting(),
  );

  /**
   * Property rolesState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly SetupOrganizationRole[]>}
   */
  private readonly rolesState: WritableSignal<readonly SetupOrganizationRole[]> = signal<
    readonly SetupOrganizationRole[]
  >([]);

  /**
   * Property rolesLoadingState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly rolesLoadingState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property roles
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
  * @type {Signal<readonly SetupOrganizationRole[]>}
   */
  protected readonly roles: Signal<readonly SetupOrganizationRole[]> = this.rolesState.asReadonly();

  /**
   * Property rolesLoading
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly rolesLoading: Signal<boolean> = this.rolesLoadingState.asReadonly();
  //#endregion

  //#region PT
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG passthrough configuration for the card.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'overflow-hidden border border-surface-200 bg-surface-0 shadow-none dark:border-surface-800 dark:bg-surface-950',
    },
    header: { class: 'p-0' },
    body: { class: 'p-0' },
    content: { class: 'p-0' },
    footer: { class: 'p-0' },
  };
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Loads available organization roles when the target organization changes.
   */
  public constructor() {
    super();
    effect(() => {
      const organizationId: string | null = this.onboardingStore.targetOrganizationId();
      if (organizationId) {
        this.rolesLoadingState.set(true);
        this.organizationSetupService
          .listRoles(organizationId)
          .pipe(takeUntilDestroyed())
          .subscribe({
            next: (roles) => {
              this.rolesState.set(roles);
              this.rolesLoadingState.set(false);
            },
            error: () => {
              this.rolesState.set([]);
              this.rolesLoadingState.set(false);
            },
          });
      } else {
        this.rolesState.set([]);
        this.rolesLoadingState.set(false);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleInvite
   * @method handleInvite
   *
   * @description
   * Sends an invitation to the specified invitee.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InviteMembersFormValues} values - Invitee values from the form.
   * @returns {void}
   */
  protected handleInvite(values: InviteMembersFormValues): void {
    const organizationId: string | null = this.onboardingStore.targetOrganizationId();
    if (!organizationId || this.anyBusy()) return;
    this.isInviting.set(true);

    this.organizationSetupService
      .inviteMembers(
        organizationId,
        values.map((v) => ({
          email: v.email,
          roleIds: v.roleId ? [v.roleId] : undefined,
        })),
      )
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.isInviting.set(false);
          const count: number = values.length;
          this.messageService.add({
            severity: 'success',
            summary: count > 1 ? 'Invitations sent' : 'Invitation sent',
            detail:
              count > 1
                ? `${count} invitations have been sent.`
                : `An invitation has been sent to ${values[0].email}.`,
            life: 4000,
          });
          this.handleComplete();
        },
        error: (error: unknown) => {
          this.isInviting.set(false);
          const message: string =
            error instanceof Error ? error.message : 'Failed to send the invitation(s).';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000,
          });
        },
      });
  }

  /**
   * Method handleComplete
   * @method handleComplete
   *
   * @description
   * Executes the invite_members onboarding step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleComplete(): void {
    this.onboardingStore.executeStep({ stepKey: 'invite_members' });
  }

  /**
   * Method handleSkip
   * @method handleSkip
   *
   * @description
   * Skips the invite_members onboarding step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleSkip(): void {
    this.onboardingStore.skipStep('invite_members');
  }
  //#endregion
}
