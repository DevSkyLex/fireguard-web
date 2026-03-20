import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  untracked,
  type Signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { OnboardingStore } from '@core/stores/onboarding';
import { EquipmentStore } from '@core/stores/equipment';
import { OnboardingStepBase } from '../onboarding-step.base';
import {
  CreateEquipmentForm,
  type CreateEquipmentFormValues,
} from '@features/onboarding/forms/create-equipment-form';

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
  providers: [EquipmentStore],
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
  private readonly onboardingStore: OnboardingStore =
    inject<OnboardingStore>(OnboardingStore);

  /**
   * Property equipmentStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  private readonly equipmentStore: EquipmentStore =
    inject<EquipmentStore>(EquipmentStore);

  /**
   * Property messageService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);
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
  protected readonly isCreating: Signal<boolean> = this.equipmentStore.isCreating;

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
    root: { class: 'overflow-hidden border border-surface-200 bg-surface-0 shadow-none dark:border-surface-800 dark:bg-surface-950' },
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
      const operation = this.equipmentStore.createOperation();
      if (operation.status === 'success') {
        this.equipmentStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          this.onboardingStore.executeStep({ stepKey: 'create_first_equipment' });
        }
      } else if (operation.status === 'error') {
        this.equipmentStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          const message: string = operation.error?.message ?? 'Failed to create the equipment.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
        }
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
    if (!organizationId || this.onboardingStore.isBusy() || this.equipmentStore.isCreating()) return;

    this.equipmentStore.create({
      organizationId,
      input: {
        type: values.type,
        brand: values.brand ?? undefined,
        model: values.model ?? undefined,
        serialNumber: values.serialNumber ?? undefined,
      },
    });
  }
  //#endregion
}
