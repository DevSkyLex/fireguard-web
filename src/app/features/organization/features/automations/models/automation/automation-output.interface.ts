import type { HydraItem } from '@core/api/models';

/**
 * Interface AutomationAttemptOutput
 * @interface AutomationAttemptOutput
 *
 * @description
 * One immutable attempt identity and its server-owned result.
 *
 * @since 1.0.0
 */
export interface AutomationAttemptOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this automation attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property runId
   * @readonly
   *
   * @description
   * Identifies the automation run that produced this attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly runId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization associated with this automation attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property ruleKey
   * @readonly
   *
   * @description
   * Identifies the automation rule associated with this attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly ruleKey: string;

  /**
   * Property subjectId
   * @readonly
   *
   * @description
   * Identifies the subject for which this execution was requested.
   *
   * @access public
   *
   * @type {string}
   */
  readonly subjectId: string;

  /**
   * Property attemptNumber
   * @readonly
   *
   * @description
   * Indicates the position of this attempt in the execution sequence.
   *
   * @access public
   *
   * @type {number}
   */
  readonly attemptNumber: number;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this automation attempt.
   *
   * @access public
   *
   * @type {'pending' | 'running' | 'failed' | 'succeeded' | 'skipped'}
   */
  readonly status: 'pending' | 'running' | 'failed' | 'succeeded' | 'skipped';

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this automation attempt was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property finishedAt
   * @readonly
   *
   * @description
   * Records when the attempt finished; null means no finish time was recorded.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly finishedAt: string | null;

  /**
   * Property requestedBy
   * @readonly
   *
   * @description
   * Identifies the member who requested this attempt, when the server reports one.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly requestedBy: string | null;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this attempt, when one exists.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly interventionId: string | null;

  /**
   * Property errorCode
   * @readonly
   *
   * @description
   * Carries the machine-readable code for a failed operation, when present.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly errorCode: string | null;

  /**
   * Property canRetry
   * @readonly
   *
   * @description
   * Indicates whether the server allows this attempt to be retried.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canRetry: boolean;
}

/**
 * Interface AutomationPolicyOutput
 * @interface AutomationPolicyOutput
 *
 * @description
 * Effective policy and server-authorized management capability.
 *
 * @since 1.0.0
 */
export interface AutomationPolicyOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this automation policy.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property ruleKey
   * @readonly
   *
   * @description
   * Identifies the automation rule governed by this policy.
   *
   * @access public
   *
   * @type {string}
   */
  readonly ruleKey: string;

  /**
   * Property enabled
   * @readonly
   *
   * @description
   * Indicates whether this automation policy is enabled.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly enabled: boolean;

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Indicates whether the current member may manage this resource.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canManage: boolean;
}
