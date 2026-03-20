import {
  Component,
  ChangeDetectionStrategy,
  computed,
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
import { InspectionStore } from '@core/stores/inspection';
import type { EquipmentOutput } from '@core/models/equipment';
import { OnboardingStepBase } from '../onboarding-step.base';
import {
  CreateInspectionForm,
  type CreateInspectionFormValues,
  type EquipmentOption,
} from '@features/onboarding/forms/create-inspection-form';

/**
 * Component RunInspectionStep
 * @class RunInspectionStep
 *
 * @description
 * Onboarding step for running the user's first inspection.
 * Loads available equipment, delegates inspection creation to
 * InspectionStore, and reacts to operation results.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-run-inspection-step',
  imports: [CardModule, TagModule, CreateInspectionForm],
  providers: [EquipmentStore, InspectionStore],
  templateUrl: './run-inspection-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunInspectionStep extends OnboardingStepBase {
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
   * Property inspectionStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  private readonly inspectionStore: InspectionStore =
    inject<InspectionStore>(InspectionStore);

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
  protected readonly isCreating: Signal<boolean> = this.inspectionStore.isCreating;

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
   * Property equipmentOptions
   * @readonly
   *
   * @description
   * Computed equipment options for the inspection form selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly EquipmentOption[]>}
   */
  protected readonly equipmentOptions: Signal<readonly EquipmentOption[]> =
    computed<readonly EquipmentOption[]>(() =>
      this.equipmentStore.equipmentEntities().map((equipment: EquipmentOutput) => ({
        id: equipment.id,
        label: equipment.serialNumber
          ? `${equipment.type} — ${equipment.serialNumber}`
          : equipment.type,
      })),
    );
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
   * Loads equipment when the target organization changes and reacts to
   * inspection store creation operation results.
   */
  public constructor() {
    super();
    effect(() => {
      const organizationId: string | null = this.onboardingStore.targetOrganizationId();
      if (organizationId) {
        this.equipmentStore.loadEquipment({ organizationId });
      }
    });

    effect(() => {
      const operation = this.inspectionStore.createOperation();
      if (operation.status === 'success') {
        this.inspectionStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          this.onboardingStore.executeStep({ stepKey: 'run_first_inspection' });
        }
      } else if (operation.status === 'error') {
        this.inspectionStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          const message: string = operation.error?.message ?? 'Failed to save the inspection.';
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
   * Handles the creation of an inspection from form values.
   * No `as` casts needed because the form values are already strongly typed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CreateInspectionFormValues} values - Form values from the creation form.
   * @returns {void}
   */
  protected handleSubmit(values: CreateInspectionFormValues): void {
    const organizationId: string | null = this.onboardingStore.targetOrganizationId();
    if (!organizationId || this.onboardingStore.isBusy() || this.inspectionStore.isCreating()) return;

    this.inspectionStore.create({
      organizationId,
      input: {
        equipmentId: values.equipmentId,
        result: values.result,
        performedAt: values.performedAt,
        inspectorType: values.inspectorType,
        inspectorName: values.inspectorName,
      },
    });
  }
  //#endregion
}
