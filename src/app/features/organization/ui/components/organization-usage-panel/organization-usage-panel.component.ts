import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ORGANIZATION_QUOTA_RESOURCE_LABELS } from '@features/organization/constants';
import { type OrganizationQuotaItemOutput, type QuotaStatus } from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { resolveQuotaStatus } from '@features/organization/utils';
import { EmptyState } from '@shared/empty-state';
import { type TagDescriptor } from '@shared/tag';

/**
 * Interface OrganizationUsageRow
 *
 * @description
 * View model for one capped-resource usage row in the settings usage tab. A
 * `null` limit means the resource is unlimited (a faded full track is rendered
 * instead of a measured fill).
 *
 * @since 1.0.0
 */
interface OrganizationUsageRow {
  readonly label: string;
  readonly used: number;
  readonly limit: number | null;
  readonly percent: number | null;
  readonly fillClass: string;
  readonly atLimit: boolean;
}

/**
 * Component OrganizationUsagePanel
 * @class OrganizationUsagePanel
 *
 * @description
 * Organization-owned usage panel rendered inside the settings page's "Usage"
 * tab. Shows the active organization's resource consumption against its plan
 * limits (members, facilities, equipment, inspections) with token-styled meter
 * bars (primary fill, semantic near/at-limit colours), driven by the
 * root-provided {@link OrganizationQuotaStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-usage-panel',
  imports: [EmptyState, SkeletonModule, TagModule],
  templateUrl: './organization-usage-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationUsagePanel {
  //#region Properties
  /** Root-provided store exposing the active organization's quota usage. */
  protected readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** Badge descriptor shown when a resource has reached its plan limit. */
  protected readonly atLimitTag: TagDescriptor = {
    label: $localize`:@@org.usage.atLimit:At limit`,
    severity: 'danger',
    icon: 'pi pi-exclamation-triangle',
  };

  /** Usage rows derived from the active organization's quota usage. */
  protected readonly rows: Signal<ReadonlyArray<OrganizationUsageRow>> = computed(() =>
    this.quotaStore.items().map((item: OrganizationQuotaItemOutput): OrganizationUsageRow => {
      const limit: number | null = item.limit;
      const ratio: number = limit === null || limit === 0 ? 0 : item.used / limit;
      const status: QuotaStatus = resolveQuotaStatus(item.used, limit);

      return {
        label: ORGANIZATION_QUOTA_RESOURCE_LABELS[item.resource] ?? item.resource,
        used: item.used,
        limit,
        percent: limit !== null && limit > 0 ? Math.min(Math.round(ratio * 100), 100) : null,
        fillClass:
          status === 'full'
            ? 'bg-red-500 dark:bg-red-400'
            : status === 'near'
              ? 'bg-amber-500 dark:bg-amber-400'
              : 'bg-primary',
        atLimit: status === 'full',
      };
    }),
  );
  //#endregion
}
