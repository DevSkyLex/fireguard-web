import type { HydraItem } from '@core/models/api';
import type { MissionIssueSeverity } from './mission-issue-severity.type';

/**
 * Interface MissionIssueOutput
 * @interface MissionIssueOutput
 *
 * @description
 * Mission validation issue returned by mission readiness checks.
 */
export interface MissionIssueOutput extends HydraItem {
  //#region Properties
  /**
   * Property severity
   * @readonly
   *
   * @description
   * Severity level of the issue.
   *
   * @type {MissionIssueSeverity}
   */
  readonly severity: MissionIssueSeverity;

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
