import type { HydraItem } from '@core/api/models';
import type { InterventionPriority } from '../intervention/intervention-priority.type';
import type { InterventionStatus } from '../intervention/intervention-status.type';
import type { InterventionResponsibleStatisticOutput } from './intervention-responsible-statistic-output.interface';
import type { InterventionSiteStatisticOutput } from './intervention-site-statistic-output.interface';

/**
 * Interface InterventionStatisticsOutput
 * @interface InterventionStatisticsOutput
 *
 * @description
 * Whole-organization intervention statistics (`GET /interventions/statistics`):
 * the list page's KPI strip. `byStatus` and `byPriority` always carry every
 * `InterventionStatus` / `InterventionPriority` literal, zeros included —
 * stable keys a consumer can key off without checking for absence.
 * `bySite` and `byResponsible` are bounded to their top 10 entries,
 * descending by count.
 */
export interface InterventionStatisticsOutput extends HydraItem {
  //#region Properties
  /**
   * Property total
   * @readonly
   *
   * @description
   * Total intervention count for the organization, every status included.
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property byStatus
   * @readonly
   *
   * @type {Readonly<Record<InterventionStatus, number>>}
   */
  readonly byStatus: Readonly<Record<InterventionStatus, number>>;

  /**
   * Property byPriority
   * @readonly
   *
   * @type {Readonly<Record<InterventionPriority, number>>}
   */
  readonly byPriority: Readonly<Record<InterventionPriority, number>>;

  /**
   * Property overdue
   * @readonly
   *
   * @description
   * Count of non-terminal interventions (excludes `published`/`abandoned`)
   * whose `dueAt` is in the past.
   *
   * @type {number}
   */
  readonly overdue: number;

  /**
   * Property dueSoon
   * @readonly
   *
   * @description
   * Count of interventions in a still-active status whose `dueAt` falls
   * within the next 48 hours.
   *
   * @type {number}
   */
  readonly dueSoon: number;

  /**
   * Property bySite
   * @readonly
   *
   * @type {readonly InterventionSiteStatisticOutput[]}
   */
  readonly bySite: readonly InterventionSiteStatisticOutput[];

  /**
   * Property byResponsible
   * @readonly
   *
   * @type {readonly InterventionResponsibleStatisticOutput[]}
   */
  readonly byResponsible: readonly InterventionResponsibleStatisticOutput[];

  /**
   * Property averagePublicationDays
   * @readonly
   *
   * @description
   * Mean number of days between an intervention's draft creation and its
   * publication, across every published intervention. `null` when the
   * organization has none.
   *
   * @type {number | null}
   */
  readonly averagePublicationDays: number | null;
  //#endregion
}
