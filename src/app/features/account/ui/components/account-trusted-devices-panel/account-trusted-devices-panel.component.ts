import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
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
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** Trusted device store exposed to the template. */
  protected readonly store: TrustedDeviceStore = inject(TrustedDeviceStore);

  /** Loads the initial trusted device collection. */
  public constructor() {
    this.reload();
  }

  /** Reloads the trusted device collection. */
  protected reload(): void {
    this.store.loadDevices();
  }

  /** Confirms and revokes one trusted device. */
  protected revoke(device: TrustedDeviceOutput): void {
    this.confirmationService.confirm({
      header: 'Revoke trusted device',
      message: `Revoke trusted device "${device.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Revoke', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.store.revokeDevice(device.id),
    });
  }

  /** Confirms and revokes all trusted devices. */
  protected revokeAll(): void {
    this.confirmationService.confirm({
      header: 'Revoke all trusted devices',
      message: 'All devices will require MFA verification again.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Revoke all', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.store.revokeAllDevices(),
    });
  }
}
