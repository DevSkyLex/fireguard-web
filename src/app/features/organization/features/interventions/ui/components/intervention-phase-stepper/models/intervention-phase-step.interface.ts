/**
 * Interface InterventionPhaseStep
 * @interface InterventionPhaseStep
 *
 * @description
 * View model for one macro-phase milestone rendered by the phase stepper.
 */
export interface InterventionPhaseStep {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable identifier of the milestone.
   *
   * @type {'prepare' | 'plan' | 'execute' | 'review' | 'publish'}
   */
  readonly key: 'prepare' | 'plan' | 'execute' | 'review' | 'publish';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized milestone label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class rendered inside the milestone circle.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property state
   * @readonly
   *
   * @description
   * Milestone progression state relative to the intervention status.
   *
   * @type {'done' | 'active' | 'upcoming'}
   */
  readonly state: 'done' | 'active' | 'upcoming';
}
