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
import type { AuditEventOutput } from '@features/organization/models';
import { EmptyState, ErrorState, Skeleton, TrendCard } from '@shared/components';

/**
 * Component DashboardRecentActivity
 * @class DashboardRecentActivity
 *
 * @description
 * Presentational feed of the newest audit ledger entries in the dashboard's
 * lower band: an initials avatar, the actor, the humanized event name and
 * the time per row. Emits `retry` from the error state. The ledger is
 * platform-wide (no organization filter exists on the endpoint), matching
 * the audit log page's view.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-recent-activity',
  templateUrl: './dashboard-recent-activity.component.html',
  imports: [DatePipe, ButtonModule, TrendCard, Skeleton, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardRecentActivity {
  //#region Inputs

  /**
   * Property events
   * @readonly
   *
   * @description
   * Newest-first audit events loaded by the dashboard's recent activity
   * slice.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly AuditEventOutput[]>}
   */
  public readonly events: InputSignal<readonly AuditEventOutput[]> =
    input.required<readonly AuditEventOutput[]>();

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
   * Replaces the feed with a retryable error state when the query failed.
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
   * Method actorLabel
   *
   * @description
   * Human label of the acting principal: the actor email when the ledger
   * discloses it, otherwise the actor type (`system`, `anonymous`, …).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AuditEventOutput} event - The ledger entry.
   * @returns {string} The display label of the actor.
   */
  protected actorLabel(event: AuditEventOutput): string {
    return event.actorEmail ?? event.actorType;
  }

  /**
   * Method actorInitials
   *
   * @description
   * Up to two uppercase initials for the avatar fallback, derived from the
   * actor email's local part (dots and dashes split words), or from the
   * actor type when no email is disclosed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AuditEventOutput} event - The ledger entry.
   * @returns {string} One or two uppercase initials.
   */
  protected actorInitials(event: AuditEventOutput): string {
    const source: string = event.actorEmail?.split('@')[0] ?? event.actorType;

    return source
      .split(/[.\-_\s+]+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Method eventLabel
   *
   * @description
   * Humanizes a dotted-snake ledger action (`organization.member_added`)
   * into readable words (`organization member added`). Actions are an open
   * backend set, so the transform is mechanical rather than a lookup table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} action - Raw ledger action name.
   * @returns {string} The humanized event label.
   */
  protected eventLabel(action: string): string {
    return action.replace(/[._]/g, ' ');
  }

  //#endregion
}
