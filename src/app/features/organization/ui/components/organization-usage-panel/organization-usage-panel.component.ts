import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MeterGroupModule, type MeterItem } from 'primeng/metergroup';
import { ORGANIZATION_QUOTA_RESOURCE_LABELS } from '@features/organization/constants';
import { type OrganizationQuotaItemOutput, type QuotaStatus } from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { quotaUsageColor, resolveQuotaStatus } from '@features/organization/utils';

/**
 * Interface OrganizationUsageRow
 *
 * @description
 * View model for one capped-resource usage row in the settings usage tab. A
 * `null` limit means the resource is unlimited (no meter bar is rendered).
 *
 * @since 1.0.0
 */
interface OrganizationUsageRow {
  readonly label: string;
  readonly used: number;
  readonly limit: number | null;
  readonly max: number;
  readonly percent: number | null;
  readonly meters: MeterItem[];
  readonly atLimit: boolean;
}

/**
 * Component OrganizationUsagePanel
 * @class OrganizationUsagePanel
 *
 * @description
 * Organization-owned usage panel rendered inside the settings page's "Usage"
 * tab. Shows the active organization's resource consumption against its plan
 * limits (members, facilities, equipment, inspections) with PrimeNG MeterGroup
 * bars, driven by the root-provided {@link OrganizationQuotaStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-usage-panel',
  imports: [MeterGroupModule],
  templateUrl: './organization-usage-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationUsagePanel {
  //#region Properties
  /** Root-provided store exposing the active organization's quota usage. */
  protected readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

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
        max: limit !== null && limit > 0 ? limit : Math.max(item.used, 1),
        percent: limit !== null && limit > 0 ? Math.min(Math.round(ratio * 100), 100) : null,
        meters: [{ label: '', value: item.used, color: quotaUsageColor(status) }],
        atLimit: status === 'full',
      };
    }),
  );
  //#endregion
}
