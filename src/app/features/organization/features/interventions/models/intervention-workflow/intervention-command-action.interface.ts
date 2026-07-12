/**
 * Interface InterventionCommandAction
 * @interface InterventionCommandAction
 *
 * @description
 * View model for the single canonical forward action of the current phase
 * (Plan, Submit or Publish). The detail page derives it from the intervention
 * status, readiness and the user's capabilities; the layout's page-header
 * action slot renders it.
 */
export interface InterventionCommandAction {
  /** Button label (e.g. `"Plan intervention"`). */
  readonly label: string;
  /** PrimeIcons class shown on the button. */
  readonly icon: string;
  /** Whether the action is currently disabled (not yet ready). */
  readonly disabled: boolean;
  /**
   * Human-readable reason the action is disabled, surfaced next to the
   * button so the gate never dead-ends silently; null while enabled.
   */
  readonly disabledReason: string | null;
  /** Whether the action is in flight. */
  readonly loading: boolean;
}
