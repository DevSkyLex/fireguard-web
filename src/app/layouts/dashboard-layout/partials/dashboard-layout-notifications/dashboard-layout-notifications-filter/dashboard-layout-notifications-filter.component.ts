import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { NotificationFilter } from '@core/models/notification';

interface TypeOption {
  label: string;
  value: NotificationFilter | null;
}

@Component({
  selector: 'app-dashboard-layout-notifications-filter',
  imports: [SelectButtonModule, FormsModule],
  templateUrl: './dashboard-layout-notifications-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotificationsFilter {
  //#region Properties
  protected readonly options: TypeOption[] = [
    { label: 'All', value: null },
    { label: 'System', value: { category: 'system' } },
  ];
  //#endregion

  //#region Inputs
  public readonly selectedValue: InputSignal<NotificationFilter | null> = input<NotificationFilter | null>(null);
  //#endregion

  //#region Outputs
  public readonly filterChange: OutputEmitterRef<NotificationFilter | null> =
    output<NotificationFilter | null>();
  //#endregion
}
