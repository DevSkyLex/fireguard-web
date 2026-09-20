import type { InterventionWorkItemFormValues } from './intervention-work-item-form-values.model';

/**
 * Interface InterventionWorkItemFormDraft
 * @interface InterventionWorkItemFormDraft
 *
 * @description
 * Editable duration parts and a calendar range, converted to minutes and local dates on submission.
 * Empty duration parts retain the distinction between unknown effort and an explicit zero.
 *
 * @version 1.0.0
 */
export interface InterventionWorkItemFormDraft extends Pick<
  InterventionWorkItemFormValues,
  'action' | 'target' | 'assignee'
> {
  /**
   * Property estimateHours
   * @readonly
   *
   * @description
   * Optional whole hours; tasks may span more than one day.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly estimateHours: string;

  /**
   * Property estimateMinutes
   * @readonly
   *
   * @description
   * Optional minute remainder between zero and fifty-nine.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly estimateMinutes: string;

  /**
   * Property workPeriod
   * @readonly
   *
   * @description
   * Complete calendar selection, or null to inherit the intervention period.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {[Date, Date] | null}
   */
  readonly workPeriod: [Date, Date] | null;
}
