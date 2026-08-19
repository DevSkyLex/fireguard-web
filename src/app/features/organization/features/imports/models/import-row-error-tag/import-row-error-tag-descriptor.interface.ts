import type { ImportStatusTagSeverity } from '../import-tag/import-status-tag-severity.type';

/**
 * Interface ImportRowErrorTagDescriptor
 * @interface ImportRowErrorTagDescriptor
 *
 * @description
 * How one `ImportRowErrorCode` value looks, wherever a report row renders
 * it. Reuses `ImportStatusTagSeverity`'s vocabulary rather than declaring a
 * second copy of the same five weights.
 *
 * @since 1.0.0
 */
export interface ImportRowErrorTagDescriptor {
  /** Localized human label, e.g. "Would create" for `would_create`. @type {string} */
  readonly label: string;

  /** `success` for the one positive code (`would_create`), `danger`/`warning` otherwise. @type {ImportStatusTagSeverity} */
  readonly severity: ImportStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
