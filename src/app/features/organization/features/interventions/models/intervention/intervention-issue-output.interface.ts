import type { HydraItem } from '@core/models/api';
import type { InterventionIssueSeverity } from './intervention-issue-severity.type';

/**
 * Interface InterventionIssueOutput
 * @interface InterventionIssueOutput
 *
 * @description
 * Intervention validation issue returned by intervention readiness checks.
 */
export interface InterventionIssueOutput extends HydraItem {
  //#region Properties
  /**
   * Property severity
   * @readonly
   *
   * @description
   * Severity level of the issue.
   *
   * @type {InterventionIssueSeverity}
   */
  readonly severity: InterventionIssueSeverity;

  /**
   * Property resource
   * @readonly
   *
   * @description
   * IRI of the resource concerned by the issue.
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property field
   * @readonly
   *
   * @description
   * Faulty resource field, or `null` for resource-level issues.
   *
   * @type {string | null}
   */
  readonly field: string | null;

  /**
   * Property message
   * @readonly
   *
   * @description
   * Human-readable description of the issue.
   *
   * @type {string}
   */
  readonly message: string;
  //#endregion
}
