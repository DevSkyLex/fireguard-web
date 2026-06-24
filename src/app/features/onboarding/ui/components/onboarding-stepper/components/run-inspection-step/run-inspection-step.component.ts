import {
  Component,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
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
import {
  CreateInspectionForm,
  type CreateInspectionFormValues,
  type EquipmentOption,
} from '@features/onboarding/ui/forms';
import { OrganizationSetupService, type SetupEquipmentSummary } from '@features/organization/setup';
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

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Lifecycle handle passed to `takeUntilDestroyed` so subscriptions started
   * outside the injection context (the equipment-loading effect and the submit
   * handler) unsubscribe when the step component is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
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
  private readonly isCreatingState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isLoadingEquipmentState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly isLoadingEquipmentState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property inspectionErrorState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<Error | null>}
   */
  private readonly inspectionErrorState: WritableSignal<Error | null> = signal<Error | null>(null);

  /**
   * Property equipmentState
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly SetupEquipmentSummary[]>}
   */
  private readonly equipmentState: WritableSignal<readonly SetupEquipmentSummary[]> = signal<
    readonly SetupEquipmentSummary[]
  >([]);

  protected readonly isCreating: Signal<boolean> = this.isCreatingState.asReadonly();

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
  protected readonly isLoadingEquipment: Signal<boolean> =
    this.isLoadingEquipmentState.asReadonly();

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
    this.equipmentState().map((equipment: SetupEquipmentSummary) => ({
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
        this.isLoadingEquipmentState.set(true);
        this.organizationSetupService
          .listEquipment(organizationId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (equipment) => {
              this.equipmentState.set(equipment);
              this.isLoadingEquipmentState.set(false);
            },
            error: () => {
              this.equipmentState.set([]);
              this.isLoadingEquipmentState.set(false);
            },
          });
      } else if (!isActiveStep) {
        this.equipmentState.set([]);
        this.isLoadingEquipmentState.set(false);
      }
    });

    effect(() => {
      const error: Error | null = this.inspectionErrorState();
      if (error) {
        if (untracked(() => this.onboardingStore.activeStepIndex() === this.stepIndex())) {
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@common.error:Error`,
            detail: error.message,
            life: 5000,
          });
        }
        this.inspectionErrorState.set(null);
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

    this.isCreatingState.set(true);
    this.organizationSetupService
      .createInspection(organizationId, {
        equipmentId: values.equipmentId,
        result: values.result,
        performedAt: values.performedAt,
        inspectorType: values.inspectorType,
        inspectorName: values.inspectorName,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isCreatingState.set(false);
          if (this.onboardingStore.activeStepIndex() === this.stepIndex()) {
            this.onboardingStore.executeStep({ stepKey: 'run_first_inspection' });
          }
        },
        error: (error: unknown) => {
          this.isCreatingState.set(false);
          this.inspectionErrorState.set(
            error instanceof Error ? error : new Error('Failed to save the inspection.'),
          );
        },
      });
  }
  //#endregion
}
