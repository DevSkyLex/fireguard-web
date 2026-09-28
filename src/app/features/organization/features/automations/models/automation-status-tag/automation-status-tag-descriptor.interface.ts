import type { AutomationStatusTagSeverity } from './automation-status-tag-severity.type';

/**
 * Interface AutomationStatusTagDescriptor
 *
 * @description
 * How one automation attempt status looks, wherever it appears. `label` and
 * `icon` both always render, so a value is legible without its colour;
 * `severity` only tints what the other two already say.
 *
 * @since 1.0.0
 */
export interface AutomationStatusTagDescriptor {
  /** Localized human label. @type {string} */
  readonly label: string;
  /** Presentation weight the render site maps to a variant and a tint. @type {AutomationStatusTagSeverity} */
  readonly severity: AutomationStatusTagSeverity;
  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
