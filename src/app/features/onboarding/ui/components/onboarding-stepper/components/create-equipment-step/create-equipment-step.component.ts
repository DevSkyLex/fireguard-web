import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { OnboardingStore } from '@features/onboarding/state';
import { CreateEquipmentForm, type CreateEquipmentFormValues } from '@features/onboarding/ui/forms';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingStepBase } from '../onboarding-step.base';

/**
 * Component CreateEquipmentStep
 * @class CreateEquipmentStep
 *
 * @description
 * Onboarding step for creating the user's first equipment.
 * Delegates creation to EquipmentStore and reacts to operation results.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-equipment-step',
  imports: [CardModule, TagModule, CreateEquipmentForm],
  templateUrl: './create-equipment-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEquipmentStep extends OnboardingStepBase {
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
   * Property equipmentStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EquipmentStore}
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
   * Property isCreating
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  private readonly isCreatingState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property createErrorState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<Error | null>}
   */
  private readonly createErrorState: WritableSignal<Error | null> = signal<Error | null>(null);

  /**
   * Property isCreating
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isCreating: Signal<boolean> = this.isCreatingState.asReadonly();

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

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Reacts to equipment store creation operation results to execute
   * the onboarding step on success or show an error message on failure.
   */
  public constructor() {
    super();
    effect(() => {
      const error: Error | null = this.createErrorState();
      if (error) {
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: 5000,
          });
        }
        this.createErrorState.set(null);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleSubmit
   * @method handleSubmit
   *
   * @description
   * Handles the creation of an equipment from form values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CreateEquipmentFormValues} values - Form values from the creation form.
   * @returns {void}
   */
  protected handleSubmit(values: CreateEquipmentFormValues): void {
    const organizationId: string | null = this.onboardingStore.targetOrganizationId();
    if (!organizationId || this.onboardingStore.isBusy() || this.isCreating()) return;

    this.isCreatingState.set(true);
    this.organizationSetupService
      .createEquipment(organizationId, {
        type: values.type,
        brand: values.brand ?? undefined,
        model: values.model ?? undefined,
        serialNumber: values.serialNumber ?? undefined,
      })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.isCreatingState.set(false);
          if (this.onboardingStore.activeStepIndex() === this.stepIndex()) {
            this.onboardingStore.executeStep({ stepKey: 'create_first_equipment' });
          }
        },
        error: (error: unknown) => {
          this.isCreatingState.set(false);
          this.createErrorState.set(
            error instanceof Error ? error : new Error('Failed to create the equipment.'),
          );
        },
      });
  }
  //#endregion
}
