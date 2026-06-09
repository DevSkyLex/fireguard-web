import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { CardModule } from 'primeng/card';
import { UserStore } from '@features/account/state';

/**
 * Account entry page presenting the authenticated user's profile.
 */
@Component({
  selector: 'app-profile-page',
  imports: [AvatarModule, CardModule, DatePipe],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  /** Authenticated user profile store exposed to the template. */
  protected readonly userStore: UserStore = inject<UserStore>(UserStore);
}
