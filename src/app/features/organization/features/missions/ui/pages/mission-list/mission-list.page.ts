import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import type { MissionOutput } from '@features/organization/features/missions/models';
import { MissionStore } from '@features/organization/features/missions/state';
import { MissionTable } from '@features/organization/features/missions/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component MissionListPage
 *
 * @description
 * Route entry page for mission listing and mission creation.
 *
 * The page reacts to the active organization context, loads available
 * missions, and starts a new mission workflow when creation succeeds.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-mission-list-page',
  imports: [MissionTable],
  providers: [MissionStore],
  templateUrl: './mission-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionListPage {
  //#region Properties
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);
  private readonly router: Router = inject(Router);
  protected readonly store = inject(MissionStore);
  //#endregion

  //#region Constructor
  public constructor() {
    effect((): void => {
      const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
      if (organizationId) {
        this.store.load({ organizationId });
      }
    });

    effect((): void => {
      const mission: MissionOutput | null = this.store.createdMission();
      const organizationId: string | undefined = this.organization.selectedOrganization()?.id;

      if (!mission || !organizationId) {
        return;
      }

      untracked((): void => this.store.clearCreatedMission());
      void this.router.navigate(['/organizations', organizationId, 'missions', mission.id]);
    });
  }
  //#endregion

  //#region Methods
  protected onCreate(name: string): void {
    const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
    if (organizationId) {
      this.store.create({ organizationId, name });
    }
  }

  protected onRefresh(): void {
    const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
    if (organizationId) {
      this.store.load({ organizationId });
    }
  }

  protected onView(mission: MissionOutput): void {
    const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
    if (organizationId) {
      void this.router.navigate(['/organizations', organizationId, 'missions', mission.id]);
    }
  }
  //#endregion
}
