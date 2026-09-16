import type { Signal } from '@angular/core';
import type { InteractionMode } from '../../models/interaction-mode.type';
import type { ShortcutModifier } from '../../models/shortcut-modifier.type';

/**
 * Interface InteractionCapabilitiesPort
 * @interface InteractionCapabilitiesPort
 * @description Application-facing contract for stable input capabilities and shortcut conventions.
 * @since 1.0.0
 */
export interface InteractionCapabilitiesPort {
  /**
   * Property interactionMode
   * @readonly
   * @description Stable interaction mode selected for the current browser session.
   * @access public
   * @since 1.0.0
   * @type {Signal<InteractionMode>}
   */
  readonly interactionMode: Signal<InteractionMode>;

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Whether controls use the phone and tablet interaction model.
   * @access public
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  readonly isMobileInteractionMode: Signal<boolean>;

  /**
   * Property shortcutModifier
   * @readonly
   * @description Platform modifier shared by every keyboard shortcut hint.
   * @access public
   * @since 1.0.0
   * @type {Signal<ShortcutModifier>}
   */
  readonly shortcutModifier: Signal<ShortcutModifier>;
}
