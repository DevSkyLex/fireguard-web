import type { InterventionTagSeverity } from './intervention-tag-severity.type';

/**
 * Presentation descriptor for a single intervention enum value.
 *
 * Pairs a human label with a severity colour AND an icon so status is never
 * conveyed by colour alone (WCAG). One descriptor drives the value wherever it
 * appears — table/panel badge or form select option.
 */
export interface InterventionTagDescriptor {
  /**
   * Human-readable label.
   *
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;

  /**
   * PrimeNG severity colour.
   *
   * @since 1.0.0
   * @type {InterventionTagSeverity}
   */
  readonly severity: InterventionTagSeverity;

  /**
   * PrimeIcons class, e.g. `pi pi-angle-up`.
   *
   * @since 1.0.0
   * @type {string}
   */
  readonly icon: string;
}
