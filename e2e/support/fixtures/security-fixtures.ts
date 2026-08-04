/**
 * Account security transport fixtures: active sessions and trusted devices.
 * Shapes mirror `SessionOutput` / `TrustedDeviceOutput`
 * (`src/app/features/auth/models`) — loose Hydra-style records keyed by
 * backend-defined field names, not strict DTOs.
 *
 * Plain factory functions (like `api-fixtures.ts`) so specs override fields
 * via object spread.
 */

export interface SessionOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly userId: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceType?: string | null;
  readonly browser?: string | null;
  readonly createdAt: string;
  readonly lastActivityAt: string;
  readonly isActive: boolean;
  readonly isCurrent: boolean;
}

function sessionOutput(overrides: Partial<SessionOutputFixture> = {}): SessionOutputFixture {
  return {
    '@id': '/api/sessions/e2e-session-1',
    '@type': 'Session',
    id: 'e2e-session-1',
    userId: 'e2e-user-1',
    ipAddress: '203.0.113.10',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    deviceType: 'desktop',
    browser: 'Chrome',
    createdAt: '2026-08-04T07:50:00+00:00',
    lastActivityAt: '2026-08-04T09:05:00+00:00',
    isActive: true,
    isCurrent: true,
    ...overrides,
  };
}

/** Three active sessions — the current one plus two others — for the account security tab. */
export function accountSessions(): ReadonlyArray<SessionOutputFixture> {
  return [
    sessionOutput(),
    sessionOutput({
      '@id': '/api/sessions/e2e-session-2',
      id: 'e2e-session-2',
      ipAddress: '198.51.100.24',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
      deviceType: 'mobile',
      browser: 'Safari',
      createdAt: '2026-08-02T18:30:00+00:00',
      lastActivityAt: '2026-08-03T21:10:00+00:00',
      isCurrent: false,
    }),
    sessionOutput({
      '@id': '/api/sessions/e2e-session-3',
      id: 'e2e-session-3',
      ipAddress: '192.0.2.77',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      deviceType: 'desktop',
      browser: 'Firefox',
      createdAt: '2026-07-29T09:00:00+00:00',
      lastActivityAt: '2026-07-31T08:00:00+00:00',
      isCurrent: false,
    }),
  ];
}

export interface TrustedDeviceOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly name: string;
  readonly lastUsedAt: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

function trustedDeviceOutput(
  overrides: Partial<TrustedDeviceOutputFixture> = {},
): TrustedDeviceOutputFixture {
  return {
    '@id': '/api/trusted-devices/e2e-device-1',
    '@type': 'TrustedDevice',
    id: 'e2e-device-1',
    name: 'Chrome on Windows',
    lastUsedAt: '2026-08-04T07:50:00+00:00',
    expiresAt: '2026-09-04T07:50:00+00:00',
    createdAt: '2026-07-05T07:50:00+00:00',
    ...overrides,
  };
}

/** One trusted device for the account security tab. */
export function accountTrustedDevices(): ReadonlyArray<TrustedDeviceOutputFixture> {
  return [trustedDeviceOutput()];
}
