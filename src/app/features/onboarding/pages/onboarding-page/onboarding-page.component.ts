import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Events } from '@ngrx/signals/events';
import { OnboardingStore, onboardingStoreEvents } from '@core/stores/onboarding';
import { OrganizationService, OrganizationInvitationService } from '@core/services/api/organization';
import type { OnboardingStepOutput } from '@core/models/onboarding';
import { CreateOrganizationForm, type CreateOrganizationFormValues } from '@features/onboarding/forms/create-organization-form';
import { InviteMembersForm, type InviteMembersFormValues } from '@features/onboarding/forms/invite-members-form';

@Component({
  selector: 'app-onboarding-page',
  imports: [
    StepperModule,
    ButtonModule,
    MessageModule,
    CreateOrganizationForm,
    InviteMembersForm,
  ],
  templateUrl: './onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  //#region Injections
  protected readonly onboardingStore: OnboardingStore = inject(OnboardingStore);
  private readonly organizationService: OrganizationService = inject(OrganizationService);
  private readonly organizationInvitationService: OrganizationInvitationService = inject(OrganizationInvitationService);
  private readonly messageService: MessageService = inject<MessageService>(MessageService);
  private readonly events: Events = inject<Events>(Events);
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Local state
  protected readonly isCreatingOrg: WritableSignal<boolean> = signal(false);
  protected readonly isInviting: WritableSignal<boolean> = signal(false);
  //#endregion

  //#region Computed
  protected readonly activeStep: Signal<number> = this.onboardingStore.activeStepIndex;
  protected readonly steps: Signal<readonly OnboardingStepOutput[]> = this.onboardingStore.steps;
  protected readonly isExecuting: Signal<boolean> = this.onboardingStore.isExecutingStep;
  protected readonly isSkipping: Signal<boolean> = this.onboardingStore.isSkippingStep;
  protected readonly isBusy: Signal<boolean> = this.onboardingStore.isBusy;
  protected readonly canRollback: Signal<boolean> = this.onboardingStore.canRollback;

  protected readonly inviteMembersStep: Signal<OnboardingStepOutput | undefined> = computed(() =>
    this.steps().find((s) => s.key === 'invite_members'),
  );

  /** True while any local or store operation is in flight */
  protected readonly anyBusy: Signal<boolean> = computed(
    () => this.isBusy() || this.isCreatingOrg() || this.isInviting(),
  );
  //#endregion

  //#region Constructor
  public constructor() {
    this.onboardingStore.start({ reset: false });

    effect(() => {
      if (this.onboardingStore.isCompleted()) {
        this.router.navigate(['/']).catch((error: unknown) => {
          console.error('Navigation failed', error);
        });
      }
    });

    this.events
      .on(onboardingStoreEvents.executeStepFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(onboardingStoreEvents.skipStepFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(onboardingStoreEvents.rollbackFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });
  }
  //#endregion

  //#region Methods

  /**
   * Phase 1 — create the organization via POST /api/organizations
   * Phase 2 — confirm the step via POST /api/onboarding/…/create_organization/execute
   */
  protected handleCreateOrganization(values: CreateOrganizationFormValues): void {
    if (this.anyBusy()) return;
    this.isCreatingOrg.set(true);

    this.organizationService.create({ name: values.organizationName }).subscribe({
      next: () => {
        this.isCreatingOrg.set(false);
        this.onboardingStore.executeStep({ stepKey: 'create_organization' });
      },
      error: (error: unknown) => {
        this.isCreatingOrg.set(false);
        const message =
          error instanceof Error ? error.message : 'Failed to create organization.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      },
    });
  }

  /**
   * Phase 1 — send an invitation via POST /api/organizations/{id}/invitations
   * The user may repeat this for multiple members before calling handleCompleteInviteMembers.
   */
  protected handleInviteMember(values: InviteMembersFormValues): void {
    const organizationId = this.onboardingStore.targetOrganizationId();
    if (!organizationId || this.anyBusy()) return;
    this.isInviting.set(true);

    this.organizationInvitationService.invite(organizationId, {
      email: values.email,
    }).subscribe({
      next: () => {
        this.isInviting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Invitation sent',
          detail: `An invitation has been sent to ${values.email}.`,
          life: 4000,
        });
      },
      error: (error: unknown) => {
        this.isInviting.set(false);
        const message =
          error instanceof Error ? error.message : 'Failed to send invitation.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
      },
    });
  }

  /**
   * Phase 2 — confirm the invite_members step once the user is done inviting.
   */
  protected handleCompleteInviteMembers(): void {
    this.onboardingStore.executeStep({ stepKey: 'invite_members' });
  }

  protected handleSkipInviteMembers(): void {
    this.onboardingStore.skipStep('invite_members');
  }

  protected handleRollback(): void {
    this.onboardingStore.rollback();
  }
  //#endregion
}
