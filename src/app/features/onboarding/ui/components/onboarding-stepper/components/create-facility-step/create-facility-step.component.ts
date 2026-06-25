import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { OnboardingStore } from '@features/onboarding/state';
import { CreateFacilitiesForm, type CreateFacilityFormValues } from '@features/onboarding/ui/forms';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingStepBase } from '../onboarding-step.base';

/**
 * Component CreateFacilityStep
 * @class CreateFacilityStep
 *
 * @description
 * Onboarding step for creating one or more facilities.
 * Sends all creation requests in parallel via FacilityService and
 * executes the onboarding step once all succeed.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-facility-step',
  imports: [TagModule, CreateFacilitiesForm],
  templateUrl: './create-facility-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFacilityStep extends OnboardingStepBase {
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
   * Property facilityService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FacilityService}
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
   * Lifecycle handle passed to `takeUntilDestroyed` so the creation subscription,
   * started from the submit handler (outside the injection context), unsubscribes
   * when the step component is destroyed.
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
   *
   * @description
   * Whether facility creation API calls are in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly isCreating: WritableSignal<boolean> = signal<boolean>(false);

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

  //#region Constructor
  /**
   * @constructor
   */
  public constructor() {
    super();
  }
  //#endregion

  //#region Methods
  /**
   * Method handleSubmit
   * @method handleSubmit
   *
   * @description
   * Creates all submitted facilities in parallel and executes the
   * onboarding step once all requests succeed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CreateFacilityFormValues[]} values - Array of facility values from the form.
   * @returns {void}
   */
  protected handleSubmit(values: CreateFacilityFormValues[]): void {
    const organizationId: string | null = this.onboardingStore.targetOrganizationId();
    if (!organizationId || this.onboardingStore.isBusy() || this.isCreating()) return;

    this.isCreating.set(true);

    this.organizationSetupService
      .createFacilities(
        organizationId,
        values.map((v) => ({
          type: v.type,
          name: v.name,
          address: v.address ?? undefined,
        })),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          const count: number = values.length;
          this.messageService.add({
            severity: 'success',
            summary:
              count > 1
                ? $localize`:@@onboarding.facility.createdManyTitle:Facilities created`
                : $localize`:@@onboarding.facility.createdOneTitle:Facility created`,
            detail:
              count > 1
                ? $localize`:@@onboarding.facility.createdMany:${count}:count: facilities have been created.`
                : $localize`:@@onboarding.facility.createdOne:${values[0].name}:name: has been created.`,
            life: 4000,
          });
          this.onboardingStore.executeStep({ stepKey: 'create_first_facility' });
        },
        error: (error: unknown) => {
          this.isCreating.set(false);
          const message: string =
            error instanceof Error
              ? error.message
              : $localize`:@@onboarding.facility.createError:Failed to create the facility.`;
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@common.error:Error`,
            detail: message,
            life: 5000,
          });
        },
      });
  }
  //#endregion
}
