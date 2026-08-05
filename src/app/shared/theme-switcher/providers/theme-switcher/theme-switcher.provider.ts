import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { ThemeSwitcher } from '../../ui/components/theme-switcher';

/**
 * Function withThemeSwitcher
 * @function withThemeSwitcher
 *
 * @description
 * Contributes {@link ThemeSwitcher} to a shell's header slot.
 *
 * It lives with the concept rather than with a layout because it names no
 * layout: any shell with a header slot can take it, and none of them learns
 * what a theme is (`ARCHITECTURE.md` §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideFocusedLayoutSlots({ header: [withThemeSwitcher()] })
 * ```
 */
export function withThemeSwitcher(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'theme-switcher',
      order: 100,
      component: ThemeSwitcher,
    }),
  };
}
