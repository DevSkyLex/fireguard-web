import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';

@Component({
  selector: 'app-dashboard-layout-notifications-header',
  templateUrl: './dashboard-layout-notifications-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotificationsHeader {
  //#region Inputs
  public readonly hasUnread: InputSignal<boolean> = input<boolean>(false);
  public readonly unreadCount: InputSignal<number> = input<number>(0);
  //#endregion
}
