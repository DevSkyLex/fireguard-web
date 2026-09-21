import type { OrganizationAdministrationLinkDefinition } from './organization-administration-link-definition.interface';

/**
 * Interface OrganizationSwitcherQuickLinkDefinition
 * @interface OrganizationSwitcherQuickLinkDefinition
 *
 * @description
 * One administration shortcut shared by the organization switcher and More page.
 *
 * @since 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSwitcherQuickLinkDefinition extends OrganizationAdministrationLinkDefinition {
  /**
   * Property shortcutKey
   * @readonly
   * @description Key used to render a desktop hint; empty when the destination has no shortcut.
   * @access public
   * @since 4.0.0
   * @type {string}
   */
  readonly shortcutKey: string;
}
