import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Logo } from '@shared/components';

/**
 * Type ShowcaseFeature
 * @typedef ShowcaseFeature
 *
 * @description
 * A single capability line rendered in the auth showcase panel: a PrimeIcons
 * glyph paired with a short label.
 *
 * @since 2.0.0
 */
type ShowcaseFeature = {
  readonly icon: string;
  readonly label: string;
};

const SHOWCASE_FEATURES: readonly ShowcaseFeature[] = [
  {
    icon: 'pi pi-box',
    label: $localize`:@@auth.showcase.feature.inventory:Equipment inventory and lifecycle`,
  },
  {
    icon: 'pi pi-check-circle',
    label: $localize`:@@auth.showcase.feature.inspections:Inspections, checklists and non-conformity tracking`,
  },
  {
    icon: 'pi pi-sitemap',
    label: $localize`:@@auth.showcase.feature.multiSite:Multi-site, multi-organization, roles and permissions`,
  },
];

/**
 * Component AuthShowcase
 * @class AuthShowcase
 *
 * @description
 * Branded panel rendered in the split layout showcase slot on the
 * authentication pages (login, register, password reset). Auth-owned content
 * contributed to the layout through `withAuthShowcase()`; the layout renders it
 * generically without knowing what it shows.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-auth-showcase />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-showcase',
  imports: [Logo],
  templateUrl: './auth-showcase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShowcase {
  /**
   * Property features
   * @readonly
   *
   * @description
   * Capability lines listed under the showcase headline.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {readonly ShowcaseFeature[]}
   */
  protected readonly features: readonly ShowcaseFeature[] = SHOWCASE_FEATURES;
}
