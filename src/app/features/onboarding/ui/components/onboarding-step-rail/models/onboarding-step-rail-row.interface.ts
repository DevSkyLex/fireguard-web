/**
 * Interface OnboardingStepRailRow
 * @interface OnboardingStepRailRow
 *
 * @description
 * One resolved row of the wizard rail: a step's presentation joined with its
 * current status, ready to render without the template branching on either
 * enum itself.
 *
 * @since 1.0.0
 */
export interface OnboardingStepRailRow {
  /** Stable row identity, matching `OnboardingStepOutput.key`. */
  readonly key: string;

  /** Short step title, e.g. "Create organization". */
  readonly label: string;

  /** Compact rail subtitle, e.g. "Your structure". */
  readonly sublabel: string;

  /** The step's own presentation glyph. */
  readonly icon: string;

  /** The step's status glyph, resolved from its status tag descriptor. */
  readonly statusIcon: string;

  /** Localized status label, always rendered next to the glyph. */
  readonly statusLabel: string;

  /** Severity colour class applied to the status glyph alone. */
  readonly statusIconClass: string;

  /** Whether this is the step the operator should act on next. */
  readonly isActive: boolean;
}
