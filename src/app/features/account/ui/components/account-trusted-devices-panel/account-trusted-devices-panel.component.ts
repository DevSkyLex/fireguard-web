import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import type { RequestOptions } from '@core/api';
import { TrustedDeviceTable } from '@features/account/ui/tables';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { TrustedDeviceStore } from '@features/auth/state';
import { ErrorBanner } from '@shared/error-state';

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
  imports: [ErrorBanner, TrustedDeviceTable],
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
  /** Fallback message shown when the device list fails to load without a server message. */
  protected readonly loadErrorMessage: string = $localize`:@@account.devices.loadError:Trusted devices could not be loaded.`;
  /** Fallback message shown when revoking a single device fails without a server message. */
  protected readonly revokeErrorMessage: string = $localize`:@@account.devices.revokeError:The trusted device could not be revoked.`;
  /** Fallback message shown when revoking all devices fails without a server message. */
  protected readonly revokeAllErrorMessage: string = $localize`:@@account.devices.revokeAllError:Trusted devices could not be revoked.`;

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
