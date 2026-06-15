import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ScrollerModule } from 'primeng/scroller';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ConnectivityService } from '@core/services/connectivity';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import {
  MyInterventionsStore,
  type MyInterventionsStoreType,
} from '@features/organization/features/interventions/state/my-interventions';
import { ActiveOrganizationStore } from '@features/organization/state';

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
    MessageModule,
    ProgressBarModule,
    ScrollerModule,
    SkeletonModule,
    TagModule,
  ],
  providers: [MyInterventionsStore],
  templateUrl: './my-interventions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInterventionsPage {
  protected readonly store: MyInterventionsStoreType = inject(MyInterventionsStore);

  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  private readonly router: Router = inject(Router);

  public constructor() {
    effect(() =>
      this.store.load({
        organizationId: this.organization.selectedOrganization()?.id ?? null,
        online: this.connectivity.online(),
      }),
    );
  }

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
