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
import { OnboardingStore } from '@features/onboarding/state';
import {
  CreateInspectionForm,
  type CreateInspectionFormValues,
  type EquipmentOption,
} from '@features/onboarding/ui/forms';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { OnboardingStepBase } from '../onboarding-step.base';

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
  private readonly equipmentStore: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /**
   * Property inspectionStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  private readonly inspectionStore: InspectionStore = inject<InspectionStore>(InspectionStore);

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
   * @description
   * True while the inspection creation operation is in progress, used to
   * disable the form and show a loading state on the submit button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isCreating: Signal<boolean> = this.inspectionStore.isCreating;

  /**
   * Property isLoadingEquipment
   * @readonly
   *
   * @description
   * True while the equipment list is loading, used to disable the form and show
   * a loading state on the equipment selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoadingEquipment: Signal<boolean> = this.equipmentStore.isLoadingEquipment;

  /**
   * Property isExecuting
   * @readonly
   *
   * @description
   * True while the onboarding step execution operation is in progress,
   * used to disable the form and show a loading state on the submit button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isExecuting: Signal<boolean> = this.onboardingStore.isExecutingStep;

  /**
   * Property isFormBusy
   * @readonly
   *
   * @description
   * True while the step is loading equipment, creating the inspection,
   * or executing the onboarding step transition.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isFormBusy: Signal<boolean> = computed<boolean>(
    () => this.isLoadingEquipment() || this.isCreating() || this.isExecuting(),
  );

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
  protected readonly equipmentOptions: Signal<readonly EquipmentOption[]> = computed<
    readonly EquipmentOption[]
  >(() =>
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
   * Loads equipment when the target organization changes and reacts to
   * inspection store creation operation results.
   */
  public constructor() {
    super();
    effect(() => {
      const organizationId: string | null = this.onboardingStore.targetOrganizationId();
      const isActiveStep: boolean = this.onboardingStore.activeStepIndex() === this.stepIndex();

      if (organizationId && isActiveStep) {
        this.equipmentStore.loadEquipment({
          organizationId,
          options: { itemsPerPage: 100 },
        });
      }
    });

    effect(() => {
      const operation = this.inspectionStore.createCallState();
      if (operation.status === 'success') {
        this.inspectionStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          this.onboardingStore.executeStep({ stepKey: 'run_first_inspection' });
        }
      } else if (operation.status === 'error') {
        this.inspectionStore.resetCreateOperation();
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          const message: string = operation.error?.message ?? 'Failed to save the inspection.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000,
          });
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
    if (!organizationId || this.onboardingStore.isBusy() || this.isFormBusy()) return;

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
