import type { InterventionPriority } from '../intervention/intervention-priority.type';

/**
 * Interface InterventionPlanningDetails
 * @interface InterventionPlanningDetails
 *
 * @description
 * Collects the site, schedule, and responsibility details used to plan an intervention.
 */
export interface InterventionPlanningDetails {
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
  readonly site: string;

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
  readonly participants: readonly string[];

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
  readonly priority: InterventionPriority;

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Records when planned start occurs for this intervention planning details.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly plannedStartAt: Date | null;

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Records when due occurs for this intervention planning details.
   *
   * @access public
   *
   * @type {Date | null}
   */
  readonly dueAt: Date | null;
}
