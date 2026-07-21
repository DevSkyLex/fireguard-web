import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  resolveInterventionTag,
  type InterventionOutput,
} from '@features/organization/features/interventions/models';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  tagSeverityDotClass,
  TrendCard,
} from '@shared/components';

/**
 * Component DashboardUpcomingInterventions
 * @class DashboardUpcomingInterventions
 *
 * @description
 * Presentational list of the soonest-due interventions in the dashboard's
 * lower band: a status dot, the intervention name and its due date per row,
 * closed by a "View all interventions" link. Emits `open` when a row is
 * activated, `viewAll` from the footer link and `retry` from the error state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-upcoming-interventions',
  templateUrl: './dashboard-upcoming-interventions.component.html',
  imports: [DatePipe, ButtonModule, TrendCard, Skeleton, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardUpcomingInterventions {
  //#region Inputs

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Due-date-sorted interventions loaded by the dashboard's upcoming
   * interventions slice.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Swaps the rows for skeleton placeholders while the query is in flight.
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
   * Replaces the list with a retryable error state when the query failed.
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
   * Emits the intervention whose row was activated, for the parent to
   * route into the intervention workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly open: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Property viewAll
   * @readonly
   *
   * @description
   * Emits the request to leave for the full intervention list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly viewAll: OutputEmitterRef<void> = output<void>();

  /**
   * Property retry
   * @readonly
   *
   * @description
   * Emits when the user asks to reload after a failed query.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retry: OutputEmitterRef<void> = output<void>();

  //#endregion

  //#region Methods

  /**
   * Method statusDotClass
   *
   * @description
   * Resolves the row's status dot classes through the interventions tag
   * registry, so a status renders identically wherever it appears.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} status - Raw workflow status value.
   * @returns {string} Tailwind classes of the coloured dot.
   */
  protected statusDotClass(status: string): string {
    return tagSeverityDotClass(resolveInterventionTag('status', status).severity);
  }

  /**
   * Method statusLabel
   *
   * @description
   * Resolves the human label of a status value through the interventions
   * tag registry, used as the dot's accessible text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} status - Raw workflow status value.
   * @returns {string} The localized status label.
   */
  protected statusLabel(status: string): string {
    return resolveInterventionTag('status', status).label;
  }

  //#endregion
}
