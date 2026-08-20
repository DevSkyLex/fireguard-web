import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TrustedDeviceOutput } from '@features/auth/models';
import { AccountTrustedDevicesPanel } from '../account-trusted-devices-panel.component';

const DEVICE: TrustedDeviceOutput = {
  '@id': '/api/trusted-devices/device-1',
  '@type': 'TrustedDevice',
  id: 'device-1',
  name: 'Chrome on Windows',
  lastUsedAt: '2026-01-02T00:00:00+00:00',
  expiresAt: '2026-06-01T00:00:00+00:00',
  createdAt: '2026-01-01T00:00:00+00:00',
};

const confirmDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="account-devices-revoke-all-dialog"]');
const confirmAction = (): HTMLButtonElement | null =>
  document.querySelector('[data-testid="account-devices-revoke-all-confirm"]');

describe('AccountTrustedDevicesPanel', () => {
  let fixture: ComponentFixture<AccountTrustedDevicesPanel>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountTrustedDevicesPanel);
    await fixture.whenStable();
  });

  it('should show an empty state when there are no trusted devices', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-devices-empty"]'),
    ).not.toBeNull();
  });

  it('should list a device and offer a revoke control', async () => {
    fixture.componentRef.setInput('devices', [DEVICE]);
    await fixture.whenStable();

    const row = fixture.nativeElement.querySelector(
      '[data-testid="account-devices-row"]',
    ) as HTMLElement;
    expect(row.textContent).toContain('Chrome on Windows');
    expect(row.querySelector('[data-testid="account-devices-revoke"]')).not.toBeNull();
  });

  it('should emit the device ID when revoke is clicked', async () => {
    fixture.componentRef.setInput('devices', [DEVICE]);
    await fixture.whenStable();

    const deviceRevoked = vi.fn();
    fixture.componentInstance.deviceRevoked.subscribe(deviceRevoked);

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-devices-revoke"]',
      ) as HTMLButtonElement
    ).dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(deviceRevoked).toHaveBeenCalledWith('device-1');
  });

  it('should show a loading placeholder instead of the list while loading', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="account-devices-loading"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-devices-empty"]')).toBeNull();
  });

  it('should show a retryable error instead of the list on load failure', async () => {
    const retried = vi.fn();
    fixture.componentInstance.retried.subscribe(retried);
    fixture.componentRef.setInput('loadError', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();

    expect(retried).toHaveBeenCalled();
  });

  it('should hide "Revoke all devices" when the list is empty', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-devices-revoke-all"]'),
    ).toBeNull();
  });

  it('should ask for confirmation before revoking every device', async () => {
    fixture.componentRef.setInput('devices', [DEVICE]);
    await fixture.whenStable();

    expect(confirmDialog()).toBeNull();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-devices-revoke-all"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(confirmDialog()).not.toBeNull();
  });

  it('should emit only once confirmed', async () => {
    const allRevoked = vi.fn();
    fixture.componentInstance.allRevoked.subscribe(allRevoked);
    fixture.componentRef.setInput('devices', [DEVICE]);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-devices-revoke-all"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(allRevoked).not.toHaveBeenCalled();

    confirmAction()?.click();
    await fixture.whenStable();

    expect(allRevoked).toHaveBeenCalled();
  });

  it('should close the confirmation once the revoke-all write settles', async () => {
    fixture.componentRef.setInput('devices', [DEVICE]);
    fixture.componentRef.setInput('revokingAll', true);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-devices-revoke-all"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(confirmDialog()).not.toBeNull();

    fixture.componentRef.setInput('revokingAll', false);
    await fixture.whenStable();

    expect(confirmDialog()).toBeNull();
  });
});
