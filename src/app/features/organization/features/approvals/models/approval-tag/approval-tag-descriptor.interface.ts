import type { ApprovalTagSeverity } from './approval-tag-severity.type';

/**
 * Interface ApprovalTagDescriptor
 *
 * @description
 * How one `ApprovalStatus` value looks, wherever it appears. `label` and
 * `icon` both always render, so a value is legible without its colour;
 * `severity` only tints what the other two already say.
 *
 * @since 1.0.0
 */
export interface ApprovalTagDescriptor {
  /** Localized human label. @type {string} */
  readonly label: string;
  /** Presentation weight the render site maps to a variant and a tint. @type {ApprovalTagSeverity} */
  readonly severity: ApprovalTagSeverity;
  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
