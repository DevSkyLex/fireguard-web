import type { HydraItem } from '@core/api/models';

/**
 * Type ServiceRequestStatus
 *
 * @description
 * Stable server workflow states.
 *
 * @since unreleased
 *
 * @type {ServiceRequestStatus}
 */
export type ServiceRequestStatus =
  | 'requested'
  | 'qualified'
  | 'rejected'
  | 'cancelled'
  | 'converted';

/**
 * Type ServiceRequestPriority
 *
 * @description
 * Declared maintenance priority.
 *
 * @since unreleased
 *
 * @type {ServiceRequestPriority}
 */
export type ServiceRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Interface ServiceRequestTargetSnapshot
 * @interface
 *
 * @description
 * Frozen minimal target identity published by the owning API.
 *
 * @since unreleased
 */
export interface ServiceRequestTargetSnapshot {
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Retained equipment identity and declared status.
   *
   * @access public
   * @since unreleased
   *
   * @type {{
   *   readonly id: string;
   *   readonly name: string | null;
   *   readonly assetCode: string | null;
   *   readonly status: string | null;
   * } | null}
   */
  readonly equipment: {
    readonly id: string;
    readonly name: string | null;
    readonly assetCode: string | null;
    readonly status: string | null;
  } | null;
  /**
   * Property site
   * @readonly
   *
   * @description
   * Retained root-site identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {{ readonly id: string; readonly name: string } | null}
   */
  readonly site: { readonly id: string; readonly name: string } | null;
  /**
   * Property customer
   * @readonly
   *
   * @description
   * Optional retained internal customer identity; contacts require separate rights.
   *
   * @access public
   * @since unreleased
   *
   * @type {{ readonly id: string; readonly name: string } | null}
   */
  readonly customer: { readonly id: string; readonly name: string } | null;
}

/**
 * Interface ServiceRequestOutput
 * @interface
 *
 * @description
 * Internal request, retained context and immutable work link returned by all mutations.
 *
 * @since unreleased
 */
export interface ServiceRequestOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable maintenance request identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization that owns this internal request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Target equipment fixed after qualification.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly equipmentId: string | null;

  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Target root site retained for the request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly siteId: string | null;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short request title.
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
   * Description of the maintenance need.
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
   * Declared scheduling priority.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestPriority}
   */
  readonly priority: ServiceRequestPriority;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-confirmed qualification and conversion state.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestStatus}
   */
  readonly status: ServiceRequestStatus;

  /**
   * Property originInspectionId
   * @readonly
   *
   * @description
   * Optional source inspection identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly originInspectionId: string | null;

  /**
   * Property originNonConformityId
   * @readonly
   *
   * @description
   * Optional source anomaly identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly originNonConformityId: string | null;

  /**
   * Property targetSnapshot
   * @readonly
   *
   * @description
   * Minimal retained identity without customer contacts.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestTargetSnapshot}
   */
  readonly targetSnapshot: ServiceRequestTargetSnapshot;

  /**
   * Property qualificationNote
   * @readonly
   *
   * @description
   * Recorded qualification explanation.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly qualificationNote: string | null;

  /**
   * Property decisionReason
   * @readonly
   *
   * @description
   * Reason for rejection or cancellation.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly decisionReason: string | null;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Confirmed intervention created or reused by conversion.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly interventionId: string | null;

  /**
   * Property taskId
   * @readonly
   *
   * @description
   * Confirmed corrective task identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly taskId: string | null;

  /**
   * Property requestedAt
   * @readonly
   *
   * @description
   * Creation instant.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly requestedAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Last accepted mutation instant.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property qualifiedAt
   * @readonly
   *
   * @description
   * Qualification instant when accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly qualifiedAt: string | null;

  /**
   * Property rejectedAt
   * @readonly
   *
   * @description
   * Rejection instant when accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly rejectedAt: string | null;

  /**
   * Property cancelledAt
   * @readonly
   *
   * @description
   * Cancellation instant when accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly cancelledAt: string | null;

  /**
   * Property convertedAt
   * @readonly
   *
   * @description
   * Conversion instant when accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly convertedAt: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Optimistic revision sent in quoted If-Match headers.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly revision: number;
}
