/**
 * Type OnboardingStepStatusTagSeverity
 *
 * @description
 * Severity vocabulary for the onboarding step status indicator. Feature-local
 * by necessity (no shared `TagSeverity` exists) — a presentation weight, never
 * a colour: the render site maps it to a literal Tailwind pair and always
 * pairs it with an icon and a label so status never depends on colour alone.
 *
 * @since 1.0.0
 */
export type OnboardingStepStatusTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
