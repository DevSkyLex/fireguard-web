import type { Signal } from '@angular/core';
import type { ExclusiveSlotContribution } from '@shared/layout-slot';

/**
 * Interface SidebarExtensionContribution
 * @interface SidebarExtensionContribution
 *
 * @description
 * A contextual column beside the primary sidebar. Its owner decides when it
 * replaces the routed content on small screens; desktop keeps both visible.
 *
 * @since 1.0.0
 */
export interface SidebarExtensionContribution extends ExclusiveSlotContribution {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the complementary navigation region.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property mobileVisible
   * @readonly
   *
   * @description
   * Whether the extension, rather than routed content, is shown below 1024px.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  readonly mobileVisible: Signal<boolean>;
}
