import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { ScrollerModule } from 'primeng/scroller';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ConnectivityService } from '@core/services/connectivity';
import type { MissionOutput } from '@features/organization/features/missions/models';
import {
  MyMissionsStore,
  type MyMissionsStoreType,
} from '@features/organization/features/missions/state/my-missions';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component MyMissionsPage.
 *
 * Signal-first field mission list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-my-missions-page',
  imports: [
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    ScrollerModule,
    SkeletonModule,
    TagModule,
  ],
  providers: [MyMissionsStore],
  templateUrl: './my-missions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyMissionsPage {
  protected readonly store: MyMissionsStoreType = inject(MyMissionsStore);

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

  protected openMission(mission: MissionOutput): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (organizationId) {
      void this.router.navigate(['/organizations', organizationId, 'missions', mission.id]);
    }
  }
}
