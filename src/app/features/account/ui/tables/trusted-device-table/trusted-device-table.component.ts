import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TablePassThroughOptions } from 'primeng/table';
import type { TrustedDeviceOutput } from '@features/auth/models';

/**
 * Table presenting trusted devices and revocation actions.
 */
@Component({
  selector: 'app-trusted-device-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    DatePipe,
    MenuModule,
    SkeletonModule,
    TableModule,
  ],
  templateUrl: './trusted-device-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedDeviceTable {
  /** Trusted devices to display. */
  public readonly devices: InputSignal<readonly TrustedDeviceOutput[]> = input.required();
  /** Whether trusted devices are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the revoke-all operation is pending. */
  public readonly revokingAll: InputSignal<boolean> = input(false);
  /** Whether at least one trusted device exists. */
  public readonly hasDevices: InputSignal<boolean> = input(false);
  /** Emits a trusted device selected for revocation. */
  public readonly revoke: OutputEmitterRef<TrustedDeviceOutput> = output();
  /** Emits a request to revoke all trusted devices. */
  public readonly revokeAll: OutputEmitterRef<void> = output();

  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems: undefined[] = Array(5);

  /** PrimeNG card pass-through classes matching the application table style. */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-0' },
  };
  /** PrimeNG table pass-through classes. */
  protected readonly tablePt: TablePassThroughOptions = {
    table: { class: 'text-sm' },
  };

  /** Shared popup menu used by device rows for contextual actions. */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');
  /** Device row currently targeted by the action menu. */
  private readonly selectedDevice: WritableSignal<TrustedDeviceOutput | null> =
    signal<TrustedDeviceOutput | null>(null);

  /** Row action menu items resolved for the targeted device. */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const device: TrustedDeviceOutput | null = this.selectedDevice();
    if (!device) return [];

    return [
      {
        label: 'Revoke device',
        icon: PrimeIcons.TIMES_CIRCLE,
        styleClass: 'text-red-500',
        command: (): void => this.revoke.emit(device),
      },
    ];
  });

  /** Stores the targeted device and toggles the shared action menu. */
  protected onActionMenuToggle(event: MouseEvent, device: TrustedDeviceOutput): void {
    this.selectedDevice.set(device);
    this.actionMenu().toggle(event);
  }
}
