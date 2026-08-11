import type { InspectionStatusTagSeverity } from './inspection-status-tag-severity.type';

/**
 * Interface InspectionStatusTagDescriptor
 *
 * @description
 * How one inspection enum value looks, wherever it appears. `label` and
 * `icon` always render, so a value is legible without its colour; `severity`
 * only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface InspectionStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to a variant and a tint. */
  readonly severity: InspectionStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucideCircleCheck`. */
  readonly icon: string;
}
