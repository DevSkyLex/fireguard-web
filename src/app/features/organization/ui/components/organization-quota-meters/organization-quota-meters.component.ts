import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MeterGroupModule, type MeterItem } from 'primeng/metergroup';
import {
  type OrganizationQuotaItemOutput,
  type OrganizationQuotaResource,
} from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';

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

  /** Human-readable labels for each capped resource. */
  private readonly resourceLabels: Record<OrganizationQuotaResource, string> = {
    members: 'Members',
    facilities: 'Facilities',
    equipment: 'Equipment',
    inspections: 'Inspections',
  };

  /** Meter rows derived from the active organization's quota usage. */
  protected readonly rows: Signal<ReadonlyArray<OrganizationQuotaMeterRow>> = computed(() =>
    this.quotaStore.items().map((item: OrganizationQuotaItemOutput): OrganizationQuotaMeterRow => {
      const limit: number | null = item.limit;
      const ratio: number = limit === null || limit === 0 ? 0 : item.used / limit;
      const atLimit: boolean = limit !== null && item.used >= limit;

      return {
        label: this.resourceLabels[item.resource] ?? item.resource,
        used: item.used,
        limit,
        max: limit !== null && limit > 0 ? limit : Math.max(item.used, 1),
        meters: [{ label: '', value: item.used, color: this.usageColor(ratio, atLimit) }],
        atLimit,
      };
    }),
  );
  //#endregion

  //#region Methods
  /**
   * Method usageColor
   *
   * @description
   * Resolves the meter colour from the usage ratio, warning near the limit and
   * turning red once the limit is reached.
   *
   * @access private
   * @param {number} ratio - Usage ratio (used / limit).
   * @param {boolean} atLimit - Whether the limit has been reached.
   * @returns {string} A CSS colour value.
   */
  private usageColor(ratio: number, atLimit: boolean): string {
    if (atLimit) {
      return 'var(--p-red-500)';
    }

    if (ratio >= 0.8) {
      return 'var(--p-orange-400)';
    }

    return 'var(--p-primary-color)';
  }
  //#endregion
}
