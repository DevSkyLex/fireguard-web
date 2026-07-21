import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import {
  resolveInterventionTag,
  type InterventionPriority,
} from '@features/organization/features/interventions/models';
import {
  InterventionPriorityIcon,
  InterventionTag,
} from '@features/organization/features/interventions/ui/components';
import type { OrganizationDashboardRecentIntervention } from '@features/organization/models';
import { EmptyState, ErrorState } from '@shared/components';

/**
 * Constant INTERVENTION_PRIORITIES
 *
 * @description
 * Known priority values used to narrow the loose dashboard payload
 * strings before handing them to the typed priority icon.
 *
 * @type {readonly InterventionPriority[]}
 */
const INTERVENTION_PRIORITIES: readonly InterventionPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
];

/**
 * Component DashboardRecentInterventions
 * @class DashboardRecentInterventions
 *
 * @description
 * Presentational table of the most recently updated interventions shown
 * under the dashboard trend cards. Renders the shared table-card shell
 * with reference/title, site, status, priority, responsible and due-date
 * columns; emits `open` when a row title is activated and `retry` from
 * the error state. Skeleton rows are driven by the per-row PrimeNG
 * `loadingbody` fallback (undefined rows), so the template holds a single
 * skeleton `<tr>`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-recent-interventions',
  templateUrl: './dashboard-recent-interventions.component.html',
  imports: [
    DatePipe,
    AvatarModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    TableModule,
    InterventionPriorityIcon,
    InterventionTag,
    EmptyState,
    ErrorState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardRecentInterventions {
  //#region Inputs

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Recently updated interventions embedded in the dashboard payload.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationDashboardRecentIntervention[]>}
   */
  public readonly interventions: InputSignal<readonly OrganizationDashboardRecentIntervention[]> =
    input.required<readonly OrganizationDashboardRecentIntervention[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Swaps the rows for skeleton placeholders while the dashboard query
   * is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Replaces the table with a retryable error state when the dashboard
   * query failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);

  //#endregion

  //#region Outputs

  /**
   * Property open
   * @readonly
   *
   * @description
   * Emits the intervention whose title was activated, for the parent to
   * route into the intervention workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationDashboardRecentIntervention>}
   */
  public readonly open: OutputEmitterRef<OrganizationDashboardRecentIntervention> =
    output<OrganizationDashboardRecentIntervention>();

  /**
   * Property retry
   * @readonly
   *
   * @description
   * Emits when the user asks to reload after a failed dashboard query.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retry: OutputEmitterRef<void> = output<void>();

  /**
   * Property openAll
   * @readonly
   *
   * @description
   * Emits the request to leave for the full intervention list. The card shows
   * the five most recently updated; without this it is a dead end.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly openAll: OutputEmitterRef<void> = output<void>();

  //#endregion

  //#region Properties

  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Placeholder collection rendered as skeleton rows while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(5);

  //#endregion

  //#region Methods

  /**
   * Method priorityOf
   *
   * @description
   * Narrows the loose payload priority string to a known
   * {@link InterventionPriority}, falling back to `normal`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - Raw priority value from the payload.
   * @returns {InterventionPriority} A known priority value.
   */
  protected priorityOf(value: string): InterventionPriority {
    return (INTERVENTION_PRIORITIES as readonly string[]).includes(value)
      ? (value as InterventionPriority)
      : 'normal';
  }

  /**
   * Method priorityLabel
   *
   * @description
   * Resolves the human label of a priority value through the
   * interventions tag registry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - Raw priority value from the payload.
   * @returns {string} The localized priority label.
   */
  protected priorityLabel(value: string): string {
    return resolveInterventionTag('priority', value).label;
  }

  /**
   * Method initials
   *
   * @description
   * Derives up to two uppercase initials from a display name for the
   * responsible avatar fallback.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - Responsible display name.
   * @returns {string} One or two uppercase initials.
   */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  //#endregion
}
