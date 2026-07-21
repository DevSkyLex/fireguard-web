import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountUserMenu } from '@features/account/ui/components/account-user-menu/account-user-menu.component';

/**
 * Component AccountTopbarMenu
 * @class AccountTopbarMenu
 *
 * @description
 * The header's account entry on narrow screens: the {@link AccountUserMenu} in
 * its compact `avatar` appearance.
 *
 * Hidden from `lg` up, where the organization rail is permanently on screen
 * and already carries the same menu — showing both would put one control in
 * two places at once. Below `lg` the rail lives inside the left drawer, so
 * reaching the account (or signing out) took opening the drawer first; this
 * brings it back to one tap, which `PRODUCT.md` asks for on the phone this
 * workflow is used on.
 *
 * Exists as a wrapper because slot widgets are instantiated through
 * `ngComponentOutlet`, which cannot bind inputs.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-topbar-menu',
  imports: [AccountUserMenu],
  host: { class: 'lg:hidden' },
  template: '<app-account-user-menu appearance="avatar" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTopbarMenu {}
