import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component InterventionCreatePage
 * @class InterventionCreatePage
 *
 * @description
 * Page for creating a guided intervention draft. Hosts {@link InterventionCreateForm},
 * loads planning selector options from {@link InterventionPlanningOptionsStore}, and
 * navigates directly into the intervention workspace on successful creation.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-page',
  imports: [InterventionCreateForm],
  providers: [InterventionPlanningOptionsStore],
  templateUrl: './intervention-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreatePage {
  //#region Properties
  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Component-scoped store providing site and member selector options
   * for the creation form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether draft creation is in flight; disables the form during submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly creating: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Store exposing the active organization context.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Intervention data-access service used to submit the creation request.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionService}
   */
  private readonly interventions: InterventionService =
    inject<InterventionService>(InterventionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate into the created intervention workspace.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes planning options for the active organization and reloads
   * them reactively when the selected organization changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      this.planningOptions.loadCreationOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Submits the validated draft values to the API and navigates into the
   * newly created intervention workspace on success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionCreateFormValues} values - Validated draft values from
   *   {@link InterventionCreateForm}.
   *
   * @returns {void}
   */
  protected create(values: InterventionCreateFormValues): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId) return;

    this.creating.set(true);
    this.interventions
      .create(organizationId, values.name.trim(), {
        type: values.type,
        priority: values.priority,
        participants: values.participants,
        ...(values.site ? { site: values.site } : {}),
        ...(values.responsible ? { responsible: values.responsible } : {}),
        ...(values.plannedStartAt ? { plannedStartAt: values.plannedStartAt } : {}),
        ...(values.dueAt ? { dueAt: values.dueAt } : {}),
      })
      .subscribe({
        next: (intervention) =>
          void this.router.navigate([
            '/organizations',
            organizationId,
            'interventions',
            intervention.id,
          ]),
        error: () => this.creating.set(false),
      });
  }
  //#endregion
}
