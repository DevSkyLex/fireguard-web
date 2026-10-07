import type { HydraItem } from '@core/api/models';
import type { MaintenanceOperationKind } from './maintenance-operation-kind.type';

/**
 * Interface MaintenancePlanOccurrenceOutput
 * @interface MaintenancePlanOccurrenceOutput
 *
 * @description
 * Original due occurrence and its current execution attempt, as evaluated by the server.
 */
export interface MaintenancePlanOccurrenceOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable occurrence identity.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;
  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Original due instant, retained across attempts.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly dueAt: string;
  /**
   * Property attempt
   * @readonly
   *
   * @description
   * Current execution attempt number.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly attempt: number;
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Work supporting the current attempt.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly interventionId?: string | null;
  /**
   * Property number
   * @readonly
   *
   * @description
   * Current intervention number when generated.
   *
   * @since unreleased
   *
   * @type {number | null}
   */
  readonly number?: number | null;
  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-owned occurrence state.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly status: 'open' | 'completed';
  /**
   * Property retryAllowed
   * @readonly
   *
   * @description
   * Whether an explicit new execution attempt is allowed.
   *
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly retryAllowed?: boolean;
}

/**
 * Interface MaintenancePlanOutput
 * @interface MaintenancePlanOutput
 *
 * @description
 * Organization-owned equipment operation. Due dates and completion remain backend-owned.
 */
export interface MaintenancePlanOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Plan identity.
   *
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
   * Owning organization.
   *
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
   * Equipment receiving the operation.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly equipmentId: string;
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Equipment's current site.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly facilityId?: string | null;
  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Stable equipment type code.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly equipmentType: string;
  /**
   * Property name
   * @readonly
   *
   * @description
   * Organization-authored operation name.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property operationKind
   * @readonly
   *
   * @description
   * Control or maintenance operation.
   *
   * @since unreleased
   *
   * @type {MaintenanceOperationKind}
   */
  readonly operationKind: MaintenanceOperationKind;
  /**
   * Property interval
   * @readonly
   *
   * @description
   * Calendar duration configured by the organization.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly interval: string;
  /**
   * Property cadenceMode
   * @readonly
   *
   * @description
   * Anchored or preserved historical recurrence.
   *
   * @since unreleased
   *
   * @type {'fixed' | 'legacy'}
   */
  readonly cadenceMode: 'fixed' | 'legacy';
  /**
   * Property calendarTimezone
   * @readonly
   *
   * @description
   * Server-owned IANA timezone preserved for the anchored operation calendar.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly calendarTimezone?: string;
  /**
   * Property anchorAt
   * @readonly
   *
   * @description
   * Calendar anchor instant.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly anchorAt?: string | null;
  /**
   * Property nextDueAt
   * @readonly
   *
   * @description
   * Server-computed next due instant.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly nextDueAt?: string | null;
  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether this plan may generate work.
   *
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly active: boolean;
  /**
   * Property legacyScheduleId
   * @readonly
   *
   * @description
   * Preserved legacy schedule when migrated.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly legacyScheduleId?: string | null;
  /**
   * Property lastCompletedAt
   * @readonly
   *
   * @description
   * Most recent validated completion.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly lastCompletedAt?: string | null;
  /**
   * Property openOccurrence
   * @readonly
   *
   * @description
   * Due work retains its original deadline and current attempt.
   *
   * @since unreleased
   *
   * @type {MaintenancePlanOccurrenceOutput | null}
   */
  readonly openOccurrence?: MaintenancePlanOccurrenceOutput | null;
  /**
   * Property archivedAt
   * @readonly
   *
   * @description
   * Archive instant when the plan leaves scheduling.
   *
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly archivedAt?: string | null;
  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation instant.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly createdAt?: string;
  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Most recent configuration change.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly updatedAt?: string;
}
