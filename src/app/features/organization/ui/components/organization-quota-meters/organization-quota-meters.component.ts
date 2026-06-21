import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MeterGroupModule, type MeterItem } from 'primeng/metergroup';
import { ORGANIZATION_QUOTA_RESOURCE_LABELS } from '@features/organization/constants';
import { type OrganizationQuotaItemOutput, type QuotaStatus } from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { quotaUsageColor, resolveQuotaStatus } from '@features/organization/utils';

/**
 * Interface OrganizationQuotaMeterRow
 *
 * @description
 * View model for one capped-resource usage meter rendered in the sidebar. A
 * `null` limit means the resource is unlimited (no meter bar is rendered).
 *
 * @since 1.0.0
 */
interface OrganizationQuotaMeterRow {
  readonly label: string;
  readonly used: number;
  readonly limit: number | null;
  readonly max: number;
  readonly meters: MeterItem[];
  readonly atLimit: boolean;
}

/**
 * Component OrganizationQuotaMeters
 * @class OrganizationQuotaMeters
 *
 * @description
 * Organization-owned context-sidebar widget rendering the active organization's
 * resource usage against its plan limits with PrimeNG MeterGroup bars (members,
 * facilities, equipment, inspections). Driven by the root-provided
 * {@link OrganizationQuotaStore}; renders nothing when there is no quota data.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-quota-meters',
  imports: [MeterGroupModule],
  templateUrl: './organization-quota-meters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationQuotaMeters {
  //#region Properties
  /** Root-provided store exposing the active organization's quota usage. */
  private readonly quotaStore: OrganizationQuotaStore = inject(OrganizationQuotaStore);

  /** Meter rows derived from the active organization's quota usage. */
  protected readonly rows: Signal<ReadonlyArray<OrganizationQuotaMeterRow>> = computed(() =>
    this.quotaStore.items().map((item: OrganizationQuotaItemOutput): OrganizationQuotaMeterRow => {
      const limit: number | null = item.limit;
      const status: QuotaStatus = resolveQuotaStatus(item.used, limit);

      return {
        label: ORGANIZATION_QUOTA_RESOURCE_LABELS[item.resource] ?? item.resource,
        used: item.used,
        limit,
        max: limit !== null && limit > 0 ? limit : Math.max(item.used, 1),
        meters: [{ label: '', value: item.used, color: quotaUsageColor(status) }],
        atLimit: status === 'full',
      };
    }),
  );
  //#endregion
}
