import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ScrollerModule } from 'primeng/scroller';
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
 * Component MyInterventionsPage.
 *
 * Signal-first field intervention list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-my-interventions-page',
  imports: [
    ButtonModule,
    EmptyState,
    InterventionTag,
    ProgressBarModule,
    ScrollerModule,
    SkeletonModule,
  ],
  providers: [MyInterventionsStore],
  templateUrl: './my-interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInterventionsPage {
  /** Property store. @readonly @description Provides field intervention state. @access protected @since 1.0.0 @type {MyInterventionsStoreType} */
  protected readonly store: MyInterventionsStoreType = inject(MyInterventionsStore);

  /** Property organization. @readonly @description Provides the active organization. @access private @since 1.0.0 @type {ActiveOrganizationStore} */
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

  /** Property connectivity. @readonly @description Provides the current connectivity state. @access private @since 1.0.0 @type {ConnectivityService} */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /** Property router. @readonly @description Provides application navigation. @access private @since 1.0.0 @type {Router} */
  private readonly router: Router = inject(Router);

  /** @constructor @description Loads assigned interventions when organization or connectivity changes. */
  public constructor() {
    effect(() =>
      this.store.load({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
        online: this.connectivity.online(),
      }),
    );
  }

  /** Method openIntervention. @method openIntervention @description Opens an assigned intervention. @access protected @since 1.0.0 @param {InterventionOutput} intervention - Intervention to open. @returns {void} */
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
}
