import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth/ports';
import { SLOT_PRESENTATION, type SlotPresentation } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component LogoutControl
 * @class LogoutControl
 *
 * @description
 * A discreet sign-out affordance for shells that render no account menu — the
 * onboarding wizard's header being the canonical host. It delegates logout
 * while the auth feature owns the resulting navigation.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-logout-control />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-logout-control',
  imports: [NgIcon, HlmButton, HlmItemImports, HlmSpinner],
  providers: [provideIcons({ lucideLogOut })],
  templateUrl: './logout-control.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutControl {
  //#region Properties
  /**
   * Property logoutPort
   * @readonly
   *
   * @description
   * Auth-owned logout contract: what the button triggers and what names the
   * in-flight state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  protected readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);

  /**
   * Property slotPresentation
   * @readonly
   * @description Presentation requested by a shell or routed navigation directory.
   * @access protected
   * @since 1.0.0
   * @type {SlotPresentation}
   */
  protected readonly slotPresentation: SlotPresentation = inject(SLOT_PRESENTATION);

  //#endregion
}
