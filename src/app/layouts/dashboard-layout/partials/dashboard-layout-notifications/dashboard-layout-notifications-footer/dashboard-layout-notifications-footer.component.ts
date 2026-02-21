import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard-layout-notifications-footer',
  imports: [ButtonModule],
  templateUrl: './dashboard-layout-notifications-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotificationsFooter {
  //#region Inputs
  public readonly hasUnread: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  public readonly markAllAsRead: OutputEmitterRef<void> = output<void>();
  //#endregion
}
