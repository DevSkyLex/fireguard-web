import type { MaintenanceTagSeverity } from './maintenance-tag-severity.type';

/**
 * Interface MaintenanceTagDescriptor
 *
 * @description
 * How one `MaintenanceDueStatus` value looks, wherever it appears. `label`
 * and `icon` both always render, so a value is legible without its colour;
 * `severity` only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface MaintenanceTagDescriptor {
  /** Localized human label. @type {string} */
  readonly label: string;
  /** Presentation weight the render site maps to a variant and a tint. @type {MaintenanceTagSeverity} */
  readonly severity: MaintenanceTagSeverity;
  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
