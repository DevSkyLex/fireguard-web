/**
 * Interface InterventionCommandAction
 * @interface InterventionCommandAction
 *
 * @description
 * View model for the single canonical forward action surfaced in the top bar
 * for the current phase (Plan, Submit or Publish). The page derives it from
 * the intervention status, readiness and the user's capabilities.
 */
export interface InterventionCommandAction {
  /** Button label (e.g. `"Plan intervention"`). */
  readonly label: string;
  /** PrimeIcons class shown on the button. */
  readonly icon: string;
  /** Whether the action is currently disabled (not yet ready). */
  readonly disabled: boolean;
  /** Whether the action is in flight. */
  readonly loading: boolean;
}
