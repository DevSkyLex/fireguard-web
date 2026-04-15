import {
  Component,
  ChangeDetectionStrategy,
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
import {
  CreateOrganizationForm,
  type CreateOrganizationFormValues,
} from '@features/onboarding/ui/forms';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingStepBase } from '../onboarding-step.base';

/**
 * Component CreateOrganizationStep
 * @class CreateOrganizationStep
 *
 * @description
 * Onboarding step for creating the user's first organization.
 * Calls OrganizationService to create the organization and then
 * executes the onboarding step on success.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-organization-step',
  imports: [CardModule, TagModule, CreateOrganizationForm],
  templateUrl: './create-organization-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrganizationStep extends OnboardingStepBase {
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
   * Property organizationService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
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
   * Property isCreatingOrganization
   * @readonly
   *
   * @description
   * Whether the organization creation API call is in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly isCreatingOrganization: WritableSignal<boolean> = signal<boolean>(false);

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

  //#region Methods
  /**
   * Method handleSubmit
   * @method handleSubmit
   *
   * @description
   * Handles the creation of an organization from form values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CreateOrganizationFormValues} values - Form values from the creation form.
   * @returns {void}
   */
  protected handleSubmit(values: CreateOrganizationFormValues): void {
    if (this.onboardingStore.isBusy() || this.isCreatingOrganization()) return;
    this.isCreatingOrganization.set(true);

    this.organizationSetupService
      .createOrganization({ name: values.organizationName })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.isCreatingOrganization.set(false);
          if (this.onboardingStore.activeStepIndex() === this.stepIndex()) {
            this.onboardingStore.executeStep({ stepKey: 'create_organization' });
          }
        },
        error: (error: unknown) => {
          this.isCreatingOrganization.set(false);
          const message: string =
            error instanceof Error ? error.message : 'Failed to create organization.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000,
          });
        },
      });
  }
  //#endregion
}
