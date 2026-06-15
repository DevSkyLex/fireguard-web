import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
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
  imports: [ButtonModule, InterventionTable],
  providers: [InterventionStore],
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
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

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
  private readonly router: Router = inject(Router);

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
  protected readonly store = inject(InterventionStore);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the class dependencies and reactive behavior.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      if (organizationId) {
        this.store.load({ organizationId });
      }
    });

    effect(() => {
      const intervention = this.store.createdIntervention();
      const organizationId = this.organizationId();

      if (!intervention || !organizationId) {
        return;
      }

      untracked(() => this.store.clearCreatedIntervention());
      void this.router.navigate([
        '/organizations',
        organizationId,
        'interventions',
        intervention.id,
      ]);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onCreate
   * @method onCreate
   *
   * @description
   * Creates a intervention with the given name under the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - Intervention name submitted by the table form.
   *
   * @return {void}
   */
  protected onCreate(name: string): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      this.store.create({ organizationId, name });
    }
  }

  /**
   * Method createGuidedIntervention
   * @method createGuidedIntervention
   *
   * @description
   * Executes the create guided intervention operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the create guided intervention operation.
   */
  protected createGuidedIntervention(): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      void this.router.navigate(['/organizations', organizationId, 'interventions', 'new']);
    }
  }

  /**
   * Method onRefresh
   * @method onRefresh
   *
   * @description
   * Reloads the intervention list for the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onRefresh(): void {
    const organizationId = this.organizationId();
    if (organizationId) {
      this.store.load({ organizationId });
    }
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
