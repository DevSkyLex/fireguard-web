import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { RequestOptions } from '@core/api';
import { TrustedDeviceTable } from '@features/account/ui/tables';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { TrustedDeviceStore } from '@features/auth/state';

/**
 * Component AccountTrustedDevicesPanel
 * @class AccountTrustedDevicesPanel
 *
 * @description
 * Trusted devices section of the account page. Coordinates trusted device
 * revocation and renders the device list. Rendered inside the "Security"
 * tab of {@link AccountPage}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-trusted-devices-panel',
  imports: [ButtonModule, MessageModule, TrustedDeviceTable],
  providers: [TrustedDeviceStore],
  templateUrl: './account-trusted-devices-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTrustedDevicesPanel {
  /** PrimeNG confirmation service used before revocation. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
  /** Trusted device store exposed to the template. */
  protected readonly store: TrustedDeviceStore = inject<TrustedDeviceStore>(TrustedDeviceStore);
  /** Last table request replayed after a list-loading error. */
  private lastLoadOptions: RequestOptions = { page: 1, itemsPerPage: 10 };

  /** Loads a trusted device page requested by the lazy table. */
  protected load(options: RequestOptions): void {
    this.lastLoadOptions = options;
    this.store.loadDevices(options);
  }

  /** Replays the failed trusted-device page request. */
  protected reload(): void {
    this.store.loadDevices(this.lastLoadOptions);
  }

  /** Confirms and revokes one trusted device. */
  protected revoke(device: TrustedDeviceOutput): void {
    this.confirmationService.confirm({
      header: $localize`:@@account.devices.revokeHeader:Revoke trusted device`,
      message: $localize`:@@account.devices.revokeConfirm:Revoke trusted device "${device.name}:name:"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.revoke:Revoke`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.store.revokeDevice(device.id),
    });
  }

  /** Confirms and revokes all trusted devices. */
  protected revokeAll(): void {
    this.confirmationService.confirm({
      header: $localize`:@@account.devices.revokeAllHeader:Revoke all trusted devices`,
      message: $localize`:@@account.devices.revokeAllConfirm:All devices will require MFA verification again.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.revokeAll:Revoke all`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.store.revokeAllDevices(),
    });
  }
}
