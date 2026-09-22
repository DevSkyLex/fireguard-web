import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FederatedConnectionsOutput } from '@features/auth/models';
import { FederatedConnectionsPanel } from '../federated-connections-panel.component';

describe('FederatedConnectionsPanel', () => {
  let fixture: ComponentFixture<FederatedConnectionsPanel>;
  const connections: FederatedConnectionsOutput = {
    '@id': '/api/auth/federated/connections',
    '@type': 'FederatedConnections',
    password_configured: false,
    last_sign_in_method: 'google',
    connections: [
      {
        provider: 'google',
        email: 'member@example.com',
        connected_at: '2026-09-22T00:00:00Z',
        last_used_at: '2026-09-22T00:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(FederatedConnectionsPanel);
    fixture.componentRef.setInput('connections', connections);
    fixture.componentRef.setInput('providers', ['microsoft']);
    await fixture.whenStable();
  });

  it('keeps an existing disabled provider manageable and exposes enabled connection choices', () => {
    const connected = vi.fn();
    const password = vi.fn();
    fixture.componentInstance.connectRequested.subscribe(connected);
    fixture.componentInstance.passwordSetupRequested.subscribe(password);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Google');
    expect(host.textContent).toContain('Microsoft');
    expect(host.textContent).toContain('member@example.com');

    const buttons = Array.from(host.querySelectorAll('button'));
    buttons.find((button) => button.textContent?.trim() === 'Connect')?.click();
    buttons.find((button) => button.textContent?.trim() === 'Set password')?.click();

    expect(connected).toHaveBeenCalledExactlyOnceWith('microsoft');
    expect(password).toHaveBeenCalledOnce();
  });

  it('emits a disconnect only after confirmation and prevents duplicate confirmation', async () => {
    const disconnected = vi.fn();
    fixture.componentInstance.disconnectRequested.subscribe(disconnected);
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((item) => item.textContent?.trim() === 'Disconnect');
    button?.click();
    await fixture.whenStable();
    expect(disconnected).not.toHaveBeenCalled();

    const confirm = document.querySelector<HTMLButtonElement>('button[hlmAlertDialogAction]');
    expect(confirm).not.toBeNull();
    confirm?.click();
    confirm?.click();

    expect(disconnected).toHaveBeenCalledExactlyOnceWith('google');
  });

  it('does not disconnect while pending and allows cancellation without mutation', async () => {
    const disconnected = vi.fn();
    fixture.componentInstance.disconnectRequested.subscribe(disconnected);
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((item) => item.textContent?.trim() === 'Disconnect');
    button?.click();
    await fixture.whenStable();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('button[hlmAlertDialogAction]')?.click();
    expect(disconnected).not.toHaveBeenCalled();

    document.querySelector<HTMLButtonElement>('button[hlmAlertDialogCancel]')?.click();
    await fixture.whenStable();
    expect(disconnected).not.toHaveBeenCalled();
  });

  it('retries a failed connections read without presenting unknown password availability as missing', async () => {
    const retried = vi.fn();
    fixture.componentInstance.retried.subscribe(retried);
    fixture.componentRef.setInput('connections', null);
    fixture.componentRef.setInput('error', 'Connection unavailable.');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection unavailable.');
    expect(host.textContent).not.toContain('Not configured');
    const retry = Array.from(host.querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === 'Retry',
    );
    retry?.click();
    expect(retried).toHaveBeenCalledOnce();
  });
});
