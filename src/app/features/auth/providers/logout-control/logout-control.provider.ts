import { LogoutControl } from '@features/auth/ui/components/logout-control';
import type { AdditiveSlotFeature } from '@shared/layout-slot';

/**
 * Function withLogoutControl
 * @function withLogoutControl
 *
 * @description
 * Contributes {@link LogoutControl} to a shell's header slot, so a screen
 * without an account menu — the onboarding wizard being the canonical case —
 * still offers a way out of the session.
 *
 * It lives with the auth feature because sign-out is auth's own behavior; the
 * hosting layout learns nothing about sessions (`ARCHITECTURE.md` §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideSplitLayoutSlots({ header: [withThemeSwitcher(), withLogoutControl()] })
 * ```
 */
export function withLogoutControl(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'logout-control',
      order: 110,
      component: LogoutControl,
    }),
  };
}
