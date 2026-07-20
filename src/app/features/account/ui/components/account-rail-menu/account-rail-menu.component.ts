import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountUserMenu } from '@features/account/ui/components/account-user-menu/account-user-menu.component';

/**
 * Component AccountRailMenu
 * @class AccountRailMenu
 *
 * @description
 * The organization rail's account entry: the {@link AccountUserMenu} in its
 * compact `avatar` appearance. Exists because slot widgets are instantiated
 * through `ngComponentOutlet`, which cannot bind inputs — this wrapper is the
 * binding.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-rail-menu',
  imports: [AccountUserMenu],
  template: '<app-account-user-menu appearance="avatar" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRailMenu {}
