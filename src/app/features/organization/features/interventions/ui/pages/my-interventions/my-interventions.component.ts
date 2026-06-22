import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ConnectivityService } from '@core/services/connectivity';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import {
  MyInterventionsStore,
  type MyInterventionsStoreType,
} from '@features/organization/features/interventions/state/my-interventions';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState } from '@shared/components';

/**
 * Component MyInterventionsPage
 * @class MyInterventionsPage
 *
 * @description
 * Signal-first field intervention list for the authenticated agent.
 * Reacts to organization and connectivity changes to load active
 * interventions from the API or the local offline cache.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-my-interventions-page',
  imports: [ButtonModule, EmptyState, InterventionTag, ProgressBarModule, SkeletonModule],
  providers: [MyInterventionsStore],
  templateUrl: './my-interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInterventionsPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing the field intervention list and
   * its loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MyInterventionsStoreType}
   */
  protected readonly store: MyInterventionsStoreType =
    inject<MyInterventionsStoreType>(MyInterventionsStore);

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
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth used to switch between API and
   * offline cache when loading the intervention list.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate into an intervention workspace.
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
   * Loads assigned interventions reactively whenever the active
   * organization or the connectivity status changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() =>
      this.store.load({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
        online: this.connectivity.online(),
      }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method openIntervention
   * @method openIntervention
   *
   * @description
   * Navigates to the workspace of the selected intervention.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to open.
   *
   * @returns {void}
   */
  protected openIntervention(intervention: InterventionOutput): void {
    const organizationId = this.organization.selectedOrganization()?.id;
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
   * Method siteLabel
   * @method siteLabel
   *
   * @description
   * Human-readable site label for a card. The cached field list carries the site
   * as a resource IRI rather than a resolved name, so an unresolved `/api/` value
   * is treated as no label (the template then shows the offline fallback) instead
   * of exposing a raw IRI to the field agent.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionOutput} intervention - Intervention to read the site from.
   *
   * @returns {string | null} Display label, or null when nothing useful to show.
   */
  protected siteLabel(intervention: InterventionOutput): string | null {
    const site: string | null = intervention.site;
    if (!site) return null;

    return site.startsWith('/api/') ? null : site;
  }
  //#endregion
}
