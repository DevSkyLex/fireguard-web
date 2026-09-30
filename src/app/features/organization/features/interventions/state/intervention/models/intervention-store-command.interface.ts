import type {
  InterventionListOptions,
  InterventionPriority,
  InterventionStatus,
  InterventionType,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionListLoadCommand
 * @interface InterventionListLoadCommand
 *
 * @description
 * Defines the organization-scoped filters and paging options for loading interventions.
 */
export interface InterventionListLoadCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property options
   * @readonly
   *
   * @description
   * Pagination, status filter and sort options forwarded to the API.
   *
   * @access public
   *
   * @type {InterventionListOptions}
   */
  readonly options?: InterventionListOptions;
}

/**
 * Interface InterventionCreateCommand
 * @interface
 *
 * @description
 * guided-creation payload so the store owns the whole create workflow (request
 * state + success handoff) instead of the page calling the service directly.
 */
export interface InterventionCreateCommand {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization scope for this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this intervention create.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this intervention create for feature-specific handling.
   *
   * @access public
   *
   * @type {InterventionType}
   */
  readonly type?: InterventionType;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Names the work site associated with this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly site?: string;

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Identifies the member assigned responsibility for this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly responsible?: string;

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Lists organization members participating in this intervention.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly participants?: readonly string[];

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Selects the operational priority of this intervention.
   *
   * @access public
   *
   * @type {InterventionPriority}
   */
  readonly priority?: InterventionPriority;

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Records when planned start occurs for this intervention create.
   *
   * @access public
   *
   * @type {Date}
   */
  readonly plannedStartAt?: Date;

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Records when due occurs for this intervention create.
   *
   * @access public
   *
   * @type {Date}
   */
  readonly dueAt?: Date;
}

/**
 * Interface InterventionTransitionCommand
 * @interface
 *
 * @description
 * Carries the revision required for the optimistic-concurrency `If-Match`
 * header; the store patches the entity optimistically and rolls back on
 * failure.
 */
export interface InterventionTransitionCommand {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this intervention transition.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention transition.
   *
   * @access public
   *
   * @type {InterventionStatus}
   */
  readonly status: InterventionStatus;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Carries the expected revision required to guard this write against stale state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;
}

/**
 * Interface InterventionDeleteCommand
 * @interface
 *
 * @description
 * required for the optimistic-concurrency `If-Match` header; the store may
 * receive several of these in quick succession (bulk selection), each
 * resolved independently.
 */
export interface InterventionDeleteCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Carries the expected revision required to guard this write against stale state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;
}

/**
 * Interface InterventionAssignCommand
 * @interface
 *
 * @description
 * entity. Carries the revision required for the optimistic-concurrency
 * `If-Match` header; the store may receive several of these in quick
 * succession (bulk assignment from the list), each resolved independently.
 */
export interface InterventionAssignCommand {
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Identifies the member assigned responsibility for this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly responsible: string;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Carries the expected revision required to guard this write against stale state.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;
}

/**
 * Interface InterventionInstantiateFromTemplateCommand
 * @interface
 *
 * @description
 * from a template" path offered alongside the manual guided-creation form.
 * The four optional fields each override the template's own default; an
 * omitted field means "use the template default". There is no `dueAt` —
 * the backend always derives it from `plannedStartAt` and the template's
 * duration.
 */
export interface InterventionInstantiateFromTemplateCommand {
  /**
   * Property templateId
   * @readonly
   *
   * @description
   * Identifies the template associated with this intervention instantiate from template.
   *
   * @access public
   *
   * @type {string}
   */
  readonly templateId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this intervention instantiate from template.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name?: string;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Names the work site associated with this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly site?: string;

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Identifies the member assigned responsibility for this intervention.
   *
   * @access public
   *
   * @type {string}
   */
  readonly responsible?: string;

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Records when planned start occurs for this intervention instantiate from template.
   *
   * @access public
   *
   * @type {Date}
   */
  readonly plannedStartAt?: Date;
}
