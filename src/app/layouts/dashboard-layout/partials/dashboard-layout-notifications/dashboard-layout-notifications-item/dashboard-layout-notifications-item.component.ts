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
import { DatePipe } from '@angular/common';
import type { NotificationOutput } from '@features/account';

const TYPE_ICONS: Record<string, string> = {
  // user
  'user.created':    'pi-user-plus',
  'user.updated':    'pi-user-edit',
  'user.deleted':    'pi-user-minus',
  'user.invited':    'pi-user-plus',
  // auth / security
  'login':           'pi-sign-in',
  'login.failed':    'pi-lock',
  'password.reset':  'pi-key',
  'security':        'pi-shield',
  // organization
  'organization.created': 'pi-building',
  'organization.updated': 'pi-building',
  'organization.deleted': 'pi-trash',
  'member.added':    'pi-users',
  'member.removed':  'pi-users',
  // system
  'maintenance':     'pi-wrench',
  'update':          'pi-sync',
  'upgrade':         'pi-arrow-circle-up',
  'alert':           'pi-exclamation-triangle',
  'error':           'pi-times-circle',
};

const CATEGORY_ICONS: Record<string, string> = {
  'organization': 'pi-sitemap',
  'system':       'pi-cog',
  'security':     'pi-shield',
  'user':         'pi-user',
};

@Component({
  selector: 'app-dashboard-layout-notifications-item',
  imports: [DatePipe],
  templateUrl: './dashboard-layout-notifications-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutNotificationsItem {
  //#region Inputs
  public readonly notification: InputSignal<NotificationOutput> =
    input.required<NotificationOutput>();
  //#endregion

  //#region Outputs
  public readonly markAsRead: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Computed
  protected readonly icon: Signal<string> = computed<string>(() => {
    const { type, category } = this.notification();
    return TYPE_ICONS[type] ?? CATEGORY_ICONS[category] ?? 'pi-bell';
  });
  //#endregion

  //#region Methods
  protected onMarkAsRead(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.notification().isRead) {
      this.markAsRead.emit();
    }
  }
  //#endregion
}
