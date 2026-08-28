import type { HydraItem } from '@core/api/models';
import type { NonConformitySeverity } from '../non-conformity/non-conformity-output.interface';

/**
 * Interface NonConformitySeverityStatisticOutput
 * @interface NonConformitySeverityStatisticOutput
 *
 * @description
 * One severity's counters in the statistics snapshot: `open` covers the
 * `open`/`in_progress` statuses, `resolved` covers `done`/`waived`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformitySeverityStatisticOutput {
  //#region Properties
  /** @type {number} */
  readonly open: number;
  /** @type {number} */
  readonly resolved: number;
  //#endregion
}

/**
 * Interface NonConformityFacilityStatisticOutput
 * @interface NonConformityFacilityStatisticOutput
 *
 * @description
 * One facility row of the top-10-by-open-count table. `name` is nullable —
 * and, API Platform omitting null fields, may arrive as `undefined`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformityFacilityStatisticOutput {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string | null | undefined} */
  readonly name?: string | null;
  /** @type {number} */
  readonly open: number;
  /** @type {number} */
  readonly critical: number;
  //#endregion
}

/**
 * Interface NonConformityEquipmentTypeStatisticOutput
 * @interface NonConformityEquipmentTypeStatisticOutput
 *
 * @description
 * One equipment-type row of the top-10-by-open-count table.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformityEquipmentTypeStatisticOutput {
  //#region Properties
  /** @type {string} */
  readonly type: string;
  /** @type {number} */
  readonly open: number;
  //#endregion
}

/**
 * Interface NonConformityResolutionStatisticOutput
 * @interface NonConformityResolutionStatisticOutput
 *
 * @description
 * Resolution timing over `resolvedAt - createdAt`, in fractional days.
 * Both are `null` when nothing was resolved inside the window — and may
 * arrive as `undefined` (API Platform omits null fields), so consumers
 * guard with a nullish check, never `=== null`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformityResolutionStatisticOutput {
  //#region Properties
  /** @type {number | null | undefined} */
  readonly averageDays?: number | null;
  /** @type {number | null | undefined} */
  readonly medianDays?: number | null;
  //#endregion
}

/**
 * Interface NonConformityStatisticsOutput
 * @interface NonConformityStatisticsOutput
 *
 * @description
 * The organization-wide non-conformity KPI snapshot
 * (`GET /organizations/{organizationId}/non-conformities/statistics`):
 * `bySeverity` always carries all four severity keys with zeros included,
 * `byFacility` and `byEquipmentType` are top-10s by open count, and
 * `slaBreachedOpen` counts unresolved rows whose SLA breach is stamped.
 * The optional `from`/`to` window filters on `createdAt`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformityStatisticsOutput extends HydraItem {
  //#region Properties
  /** @type {Readonly<Record<NonConformitySeverity, NonConformitySeverityStatisticOutput>>} */
  readonly bySeverity: Readonly<
    Record<NonConformitySeverity, NonConformitySeverityStatisticOutput>
  >;
  /** @type {readonly NonConformityFacilityStatisticOutput[]} */
  readonly byFacility: readonly NonConformityFacilityStatisticOutput[];
  /** @type {readonly NonConformityEquipmentTypeStatisticOutput[]} */
  readonly byEquipmentType: readonly NonConformityEquipmentTypeStatisticOutput[];
  /** @type {NonConformityResolutionStatisticOutput} */
  readonly resolution: NonConformityResolutionStatisticOutput;
  /** @type {number} */
  readonly slaBreachedOpen: number;
  //#endregion
}
