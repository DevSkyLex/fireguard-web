import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { DataViewModule } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InfiniteScrollDirective } from '@shared/directives';
import { DashboardLayoutNotificationsItem } from '../dashboard-layout-notifications-item/dashboard-layout-notifications-item.component';
import type { NotificationOutput } from '@core/models/notification';

@Component({
  selector: 'app-dashboard-layout-notifications-list',
  imports: [DataViewModule, SkeletonModule, ProgressSpinnerModule, InfiniteScrollDirective, DashboardLayoutNotificationsItem],
  templateUrl: './dashboard-layout-notifications-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotificationsList {
  //#region Properties
  public readonly notifications: InputSignal<ReadonlyArray<NotificationOutput>> =
    input<ReadonlyArray<NotificationOutput>>([]);

  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);

  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);

  public readonly markAsRead: OutputEmitterRef<string> = output<string>();

  public readonly loadMore: OutputEmitterRef<void> = output<void>();
  //#endregion

  protected readonly skeletonItems: number[] = [1, 2, 3, 4, 5];
  //#endregion

  //#region Computed
  protected readonly notificationsList: Signal<NotificationOutput[]> =
    computed<NotificationOutput[]>(() => this.notifications() as NotificationOutput[]);
  //#endregion
}
