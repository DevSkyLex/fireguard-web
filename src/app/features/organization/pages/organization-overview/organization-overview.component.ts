import { Component, ChangeDetectionStrategy, computed, inject, OnInit, type Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { OrganizationStore } from '@core/stores/organization';
import type { OrganizationOutput, OrganizationStatisticsOutput } from '@core/models/organization';

interface StatCard {
  readonly label: string;
  readonly value: number;
  readonly icon: string;
  readonly color: string;
  readonly route: string | null;
  readonly description: string;
}

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Organization overview dashboard page inspired by Linear's clean design.
 * Shows key statistics and quick actions for the active organization.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview',
  imports: [RouterModule, ButtonModule, CardModule, AvatarModule, SkeletonModule, TagModule, DividerModule],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage implements OnInit {
  protected readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  protected readonly organization: Signal<OrganizationOutput | null> =
    computed<OrganizationOutput | null>(() => this.organizationStore.selectedOrganization());

  protected readonly statistics: Signal<OrganizationStatisticsOutput | null> =
    computed<OrganizationStatisticsOutput | null>(() => this.organizationStore.statistics());

  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.organizationStore.isLoadingStatistics());

  protected readonly statCards: Signal<StatCard[]> = computed<StatCard[]>(() => {
    const stats: OrganizationStatisticsOutput | null = this.statistics();
    return [
      {
        label: 'Members',
        value: stats?.memberCount ?? 0,
        icon: 'pi pi-users',
        color: 'text-blue-500',
        route: null,
        description: 'Active team members',
      },
      {
        label: 'Facilities',
        value: stats?.facilityCount ?? 0,
        icon: 'pi pi-building',
        color: 'text-emerald-500',
        route: null,
        description: 'Registered facilities',
      },
    ];
  });

  public ngOnInit(): void {
    const org: OrganizationOutput | null = this.organization();
    if (org) {
      this.organizationStore.loadStatistics(org.id);
    }
  }
}
