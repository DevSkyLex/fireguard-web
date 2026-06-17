import type { TagSeverity } from './tag-severity.type';

/**
 * Presentation descriptor for a single enum/status value.
 *
 * Pairs a human label with a severity colour role AND an icon so status is
 * never conveyed by colour alone (WCAG). Feature registries resolve their
 * domain enums into this shape and hand it to the shared {@link Tag}
 * component, which owns the neutral-pill styling and the severity → colour
 * mapping.
 */
export interface TagDescriptor {
  /**
   * Human-readable label.
   *
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;

  /**
   * Semantic severity colour role applied to the icon.
   *
   * @since 1.0.0
   * @type {TagSeverity}
   */
  readonly severity: TagSeverity;

  /**
   * PrimeIcons class, e.g. `pi pi-check-circle`.
   *
   * @since 1.0.0
   * @type {string}
   */
  readonly icon: string;
}
