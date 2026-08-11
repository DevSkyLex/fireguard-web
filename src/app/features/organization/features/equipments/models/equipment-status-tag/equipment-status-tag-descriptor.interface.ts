import type { EquipmentStatusTagSeverity } from './equipment-status-tag-severity.type';

/**
 * Interface EquipmentStatusTagDescriptor
 *
 * @description
 * How one equipment status enum value looks, wherever it appears. `label`
 * and `icon` always render, so a value is legible without its colour;
 * `severity` only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface EquipmentStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to a variant and a tint. */
  readonly severity: EquipmentStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucidePackage`. */
  readonly icon: string;
}
