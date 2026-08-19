import type { ImportStatusTagSeverity } from './import-status-tag-severity.type';

/**
 * Interface ImportStatusTagDescriptor
 * @interface ImportStatusTagDescriptor
 *
 * @description
 * How one `ImportJobStatus` value looks, wherever it appears. `label` and
 * `icon` both always render, so a value is legible without its colour.
 *
 * @since 1.0.0
 */
export interface ImportStatusTagDescriptor {
  /** Localized human label. @type {string} */
  readonly label: string;

  /** Presentation weight the render site maps to a variant and a tint. @type {ImportStatusTagSeverity} */
  readonly severity: ImportStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
