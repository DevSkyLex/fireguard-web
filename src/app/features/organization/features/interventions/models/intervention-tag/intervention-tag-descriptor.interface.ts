import type { InterventionTagSeverity } from './intervention-tag-severity.type';

/**
 * Interface InterventionTagDescriptor
 *
 * @description
 * How one intervention enum value looks, wherever it appears.
 *
 * The three fields are deliberately inseparable: `label` and `icon` both
 * always render, so a value is legible without its colour, and `severity`
 * only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface InterventionTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to a variant and a tint. */
  readonly severity: InterventionTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucideSignalHigh`. */
  readonly icon: string;
}
