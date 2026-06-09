import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { UserStore } from '@features/account/state';

/**
 * Component AccountProfilePanel
 * @class AccountProfilePanel
 *
 * @description
 * Profile section of the account page. Presents the authenticated user's
 * identity, avatar and access status. Rendered inside the "Profile" tab of
 * {@link AccountPage}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-profile-panel',
  imports: [DatePipe, TitleCasePipe, CardModule, TagModule],
  templateUrl: './account-profile-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfilePanel {
  /** Authenticated user profile store exposed to the template. */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);
}
