import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SessionOutput } from '@features/auth/models';
import { AccountSessionsPanel } from '../account-sessions-panel.component';

const CURRENT_SESSION: SessionOutput = {
  '@id': '/api/sessions/current',
  '@type': 'Session',
  id: 'current',
  userId: 'user-1',
  ipAddress: '203.0.113.5',
  userAgent: 'Mozilla/5.0',
  deviceType: 'desktop',
  browser: 'Chrome',
  createdAt: '2026-01-01T00:00:00+00:00',
  lastActivityAt: '2026-01-02T00:00:00+00:00',
  isActive: true,
  isCurrent: true,
};

const OTHER_SESSION: SessionOutput = {
  '@id': '/api/sessions/other',
  '@type': 'Session',
  id: 'other',
  userId: 'user-1',
  ipAddress: '198.51.100.7',
  userAgent: 'Mozilla/5.0',
  deviceType: 'mobile',
  browser: 'Safari',
  createdAt: '2026-01-01T00:00:00+00:00',
  lastActivityAt: '2026-01-03T00:00:00+00:00',
  isActive: true,
  isCurrent: false,
};

const confirmDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="account-sessions-revoke-others-dialog"]');
const confirmAction = (): HTMLButtonElement | null =>
  document.querySelector('[data-testid="account-sessions-revoke-others-confirm"]');

describe('AccountSessionsPanel', () => {
  let fixture: ComponentFixture<AccountSessionsPanel>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountSessionsPanel);
    fixture.componentRef.setInput('sessions', [CURRENT_SESSION, OTHER_SESSION]);
    fixture.componentRef.setInput('currentSessionId', 'current');
    await fixture.whenStable();
  });

  it('should flag the current session and hide its revoke control', () => {
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="account-sessions-row"]',
      ) as NodeListOf<HTMLElement>,
    );

    const currentRow = rows.find((row) => row.textContent?.includes('Current'));
    expect(currentRow?.querySelector('[data-testid="account-sessions-revoke"]')).toBeNull();
  });

  it('shows a city and localized country with approximation and attribution', async () => {
    fixture.componentRef.setInput('sessions', [
      { ...CURRENT_SESSION, country: 'FR', city: 'Paris' },
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Paris · France');
    expect(fixture.nativeElement.textContent).toContain('Approximate location');
    expect(
      fixture.nativeElement.querySelector('a[href="https://db-ip.com/"]')?.textContent,
    ).toContain('Geolocation by DB-IP');
  });

  it.each([
    ['fr', 'France'],
    ['es', 'Francia'],
  ])('uses the supplied %s locale for country names', async (locale, countryName) => {
    fixture.componentRef.setInput('locale', locale);
    fixture.componentRef.setInput('sessions', [
      { ...CURRENT_SESSION, country: 'FR', city: 'Paris' },
    ]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(`Paris · ${countryName}`);
  });

  it('shows country only and escapes the city as text', async () => {
    fixture.componentRef.setInput('sessions', [
      { ...CURRENT_SESSION, country: 'ES', city: null },
      { ...OTHER_SESSION, country: 'FR', city: '<img src=x onerror=alert(1)>' },
    ]);
    await fixture.whenStable();
    const locations = fixture.nativeElement.querySelectorAll(
      '[data-testid="account-sessions-location"]',
    );
    expect(locations[0].textContent).toContain('Spain');
    expect(locations[1].textContent).toContain('<img src=x onerror=alert(1)>');
    expect(locations[1].querySelector('img')).toBeNull();
  });

  it('shows unavailable for legacy and malformed locations without attribution', async () => {
    fixture.componentRef.setInput('sessions', [
      CURRENT_SESSION,
      { ...OTHER_SESSION, country: 'invalid', city: 'Paris' },
    ]);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="account-sessions-location"]'),
    ).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Location unavailable');
    expect(
      fixture.nativeElement.querySelector('[data-testid="account-sessions-attribution"]'),
    ).toBeNull();
  });

  it('should offer a revoke control on other sessions', () => {
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="account-sessions-row"]',
      ) as NodeListOf<HTMLElement>,
    );

    const otherRow = rows.find((row) => !row.textContent?.includes('Current'));
    expect(otherRow?.querySelector('[data-testid="account-sessions-revoke"]')).not.toBeNull();
  });

  it('should emit the session ID when revoke is clicked', async () => {
    const sessionRevoked = vi.fn();
    fixture.componentInstance.sessionRevoked.subscribe(sessionRevoked);

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-sessions-revoke"]',
      ) as HTMLButtonElement
    ).dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(sessionRevoked).toHaveBeenCalledWith('other');
  });

  it('should show a loading placeholder instead of the list while loading', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="account-sessions-loading"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-sessions-row"]')).toBeNull();
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

  it('should hide "Sign out other sessions" when there is nothing else to sign out of', async () => {
    fixture.componentRef.setInput('hasOtherSessions', false);
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="account-sessions-revoke-others"]'),
    ).toBeNull();
  });

  it('should ask for confirmation before signing out other sessions', async () => {
    fixture.componentRef.setInput('hasOtherSessions', true);
    await fixture.whenStable();

    expect(confirmDialog()).toBeNull();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-sessions-revoke-others"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(confirmDialog()).not.toBeNull();
  });

  it('should emit only once confirmed', async () => {
    const othersRevoked = vi.fn();
    fixture.componentInstance.othersRevoked.subscribe(othersRevoked);
    fixture.componentRef.setInput('hasOtherSessions', true);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-sessions-revoke-others"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(othersRevoked).not.toHaveBeenCalled();

    confirmAction()?.click();
    await fixture.whenStable();

    expect(othersRevoked).toHaveBeenCalled();
  });

  it('should close the confirmation once the revoke-others write settles', async () => {
    fixture.componentRef.setInput('hasOtherSessions', true);
    fixture.componentRef.setInput('revokingOthers', true);
    await fixture.whenStable();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="account-sessions-revoke-others"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(confirmDialog()).not.toBeNull();

    fixture.componentRef.setInput('revokingOthers', false);
    await fixture.whenStable();

    expect(confirmDialog()).toBeNull();
  });
});
