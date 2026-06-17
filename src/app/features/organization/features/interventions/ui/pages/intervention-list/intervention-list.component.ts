import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignalWithTransform,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { InterventionTable } from '@features/organization/features/interventions/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component InterventionListPage
 * @class InterventionListPage
 *
 * @description
 * Route entry page for intervention listing and intervention creation.
 *
 * The page reacts to the active organization context, loads available
 * interventions, and navigates into the intervention workflow when creation succeeds.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-list-page',
  imports: [DialogModule, InterventionCreateForm, InterventionTable],
  providers: [InterventionStore, InterventionPlanningOptionsStore],
  templateUrl: './intervention-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionListPage {
  //#region Properties
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
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to intervention detail pages.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used to update the `?page=` query param while
   * preserving other query params.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Input page
   * @readonly
   *
   * @description
   * Current page number bound from the `?page=` query param via
   * `withComponentInputBinding`, forwarded to the table as `initialPage`.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
   */
  public readonly page: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)),
  });

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped intervention store powering the list and creation flows.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Component-scoped store providing site and member selector options for the
   * guided creation dialog. Loaded lazily when the dialog is opened.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property createDialogVisible
   * @readonly
   *
   * @description
   * Whether the guided creation dialog is currently open.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether a guided creation request is in flight; disables the dialog form.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly creating: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Intervention data-access service used to submit the guided creation request.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {InterventionService}
   */
  private readonly interventions: InterventionService =
    inject<InterventionService>(InterventionService);
  //#endregion

  //#region Methods
  /**
   * Method openCreateDialog
   * @method openCreateDialog
   *
   * @description
   * Opens the guided creation dialog and lazily loads the site and member
   * selector options for the active organization.
   *
   * @access protected
   * @since 1.2.0
   *
   * @return {void}
   */
  protected openCreateDialog(): void {
    this.planningOptions.loadCreationOptions(this.organizationId() ?? null);
    this.createDialogVisible.set(true);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Submits the validated guided draft values to the API and navigates into the
   * newly created intervention workspace on success.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {InterventionCreateFormValues} values - Validated draft values emitted
   *   by {@link InterventionCreateForm}.
   *
   * @return {void}
   */
  protected create(values: InterventionCreateFormValues): void {
    const organizationId = this.organizationId();
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

  /**
   * Method onLoad
   * @method onLoad
   *
   * @description
   * Forwards the table lazy-load params to the store for the active organization.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionListOptions} options - Pagination, filter and sort params emitted by the table.
   *
   * @return {void}
   */
  protected onLoad(options: InterventionListOptions): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      this.store.load({ organizationId, options });
    }
  }

  /**
   * Method onPageChange
   * @method onPageChange
   *
   * @description
   * Updates the `?page=` query param when the user changes page, omitting page 1.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {number} page - One-based page number selected in the table.
   *
   * @return {void}
   */
  protected onPageChange(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the detail page of the selected intervention.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention selected in the table.
   *
   * @return {void}
   */
  protected onView(intervention: InterventionOutput): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      void this.router.navigate([
        '/organizations',
        organizationId,
        'interventions',
        intervention.id,
      ]);
    }
  }

  /**
   * Method organizationId
   * @method organizationId
   *
   * @description
   * Returns the active organization identifier, if any.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {string | undefined} Active organization identifier, if any.
   */
  private organizationId(): string | undefined {
    return this.organization.selectedOrganization()?.id;
  }
  //#endregion
}
