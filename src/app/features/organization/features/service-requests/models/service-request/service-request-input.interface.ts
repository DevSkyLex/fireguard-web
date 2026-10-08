import type { ServiceRequestPriority } from './service-request-output.interface';

/**
 * Interface CreateServiceRequestInput
 * @interface
 *
 * @description
 * Initial description and authorized target, with optional source inspection.
 *
 * @since unreleased
 */
export interface CreateServiceRequestInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Equipment target, when known.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly equipmentId?: string | null;

  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Root site target; equipment or site is required.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly siteId?: string | null;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Required title up to 160 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Required description up to 10000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Optional declared priority; normal is the server default.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestPriority}
   */
  readonly priority?: ServiceRequestPriority;

  /**
   * Property originInspectionId
   * @readonly
   *
   * @description
   * Optional source inspection.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly originInspectionId?: string | null;

  /**
   * Property originNonConformityId
   * @readonly
   *
   * @description
   * Optional source anomaly.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly originNonConformityId?: string | null;
}

/**
 * Interface UpdateServiceRequestInput
 * @interface
 *
 * @description
 * Editable description only while the request remains requested.
 *
 * @since unreleased
 */
export interface UpdateServiceRequestInput {
  /**
   * Property title
   * @readonly
   *
   * @description
   * Updated title up to 160 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly title?: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Updated description up to 10000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly description?: string;

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Updated priority.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestPriority}
   */
  readonly priority?: ServiceRequestPriority;
}

/**
 * Interface QualifyServiceRequestInput
 * @interface
 *
 * @description
 * Explicit qualification; site-only requests must select one equipment from that site.
 *
 * @since unreleased
 */
export interface QualifyServiceRequestInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Equipment selected for a site-only request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly equipmentId?: string | null;

  /**
   * Property note
   * @readonly
   *
   * @description
   * Optional qualification explanation up to 10000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly note?: string | null;
}

/**
 * Interface DecisionServiceRequestInput
 * @interface
 *
 * @description
 * Motivated rejection or cancellation.
 *
 * @since unreleased
 */
export interface DecisionServiceRequestInput {
  /**
   * Property reason
   * @readonly
   *
   * @description
   * Required explanation up to 2000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly reason: string;
}

/**
 * Interface ConvertServiceRequestInput
 * @interface
 *
 * @description
 * Stable conversion command preserved exactly for uncertain response replay.
 *
 * @since unreleased
 */
export interface ConvertServiceRequestInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID for this conversion attempt.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property existingInterventionId
   * @readonly
   *
   * @description
   * Optional intervention reused instead of creating a new one.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly existingInterventionId?: string | null;

  /**
   * Property existingTaskId
   * @readonly
   *
   * @description
   * Optional existing corrective task within the selected intervention.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly existingTaskId?: string | null;
}
