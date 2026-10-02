import { expect, test } from '@playwright/test';
import type { SessionOutput } from '../../../src/app/features/auth/models/session/session-output.interface';
import { ApiMock } from '../support/mocks/api-mock';

const sessions: ReadonlyArray<SessionOutput> = [
  {
    '@id': '/api/sessions/geo-full',
    '@type': 'Session',
    id: 'geo-full',
    userId: 'e2e-user-1',
    ipAddress: '8.8.8.8',
    userAgent: 'unknown',
    browser: null,
    deviceType: null,
    country: 'FR',
    city: 'Saint-Laurent-de-la-Salanque',
    createdAt: '2026-10-01T08:00:00Z',
    lastActivityAt: '2026-10-01T08:00:00Z',
    isActive: true,
    isCurrent: false,
  },
  {
    '@id': '/api/sessions/geo-country',
    '@type': 'Session',
    id: 'geo-country',
    userId: 'e2e-user-1',
    ipAddress: '9.9.9.9',
    userAgent: 'unknown',
    country: 'ES',
    city: null,
    createdAt: '2026-10-01T08:00:00Z',
    lastActivityAt: '2026-10-01T08:00:00Z',
    isActive: true,
    isCurrent: false,
  },
  {
    '@id': '/api/sessions/geo-legacy',
    '@type': 'Session',
    id: 'geo-legacy',
    userId: 'e2e-user-1',
    ipAddress: '127.0.0.1',
    userAgent: 'unknown',
    createdAt: '2026-10-01T08:00:00Z',
    lastActivityAt: '2026-10-01T08:00:00Z',
    isActive: true,
    isCurrent: false,
  },
];

test.describe('Session sign-in locations', () => {
  for (const width of [1280, 390]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`shows snapshots and preserves revocation at ${width}px in ${theme}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const api = new ApiMock(page);
        await api.mockAuthenticatedSession();
        await api.mockAccountVisualReads();
        await api.mockAccountSessions(sessions);
        await page.goto('/account/security');
        await expect(page.getByTestId('account-sessions-location').first()).toContainText(
          'Saint-Laurent-de-la-Salanque · France',
        );
        await expect(page.getByTestId('account-sessions-location').nth(1)).toContainText('Spain');
        await expect(page.getByTestId('account-sessions-location').nth(2)).toHaveText(
          'Location unavailable',
        );
        await expect(page.getByTestId('account-sessions-attribution')).toContainText(
          'Approximate location',
        );
        await expect(page.getByRole('link', { name: 'Geolocation by DB-IP' })).toHaveAttribute(
          'href',
          'https://db-ip.com/',
        );
        await page.evaluate(
          (value) => document.documentElement.setAttribute('data-theme', value),
          theme,
        );
        await page.locator('#account-sessions-section').scrollIntoViewIfNeeded();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.locator('#account-sessions-section').screenshot({
          path: testInfo.outputPath(`geoip-${width}-${theme}.png`),
          animations: 'disabled',
        });
        const removed = page.waitForRequest(
          (request) =>
            request.method() === 'DELETE' && request.url().includes('/api/sessions/geo-country'),
        );
        await page
          .getByTestId('account-sessions-row')
          .nth(1)
          .getByTestId('account-sessions-revoke')
          .click();
        await removed;
        await expect(page.getByTestId('account-sessions-row')).toHaveCount(2);
      });
    }
  }
});
