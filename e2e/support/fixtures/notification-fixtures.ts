/**
 * Account notification transport fixtures. Shapes mirror `NotificationOutput`
 * (`src/app/features/account/models/notification`) — loose Hydra-style
 * records keyed by backend-defined field names, not strict DTOs.
 *
 * Plain factory functions (like `api-fixtures.ts`) so specs override fields
 * via object spread.
 */

export interface NotificationOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly subject: string;
  readonly body: string;
  readonly channels: ReadonlyArray<string>;
  readonly payload: Readonly<Record<string, string | null>>;
  readonly isRead: boolean;
  readonly createdAt: string;
  readonly readAt: string | null;
}

function notificationOutput(
  overrides: Partial<NotificationOutputFixture> = {},
): NotificationOutputFixture {
  return {
    '@id': '/api/notifications/e2e-notif-1',
    '@type': 'NotificationOutput',
    id: 'e2e-notif-1',
    type: 'organization.updated',
    category: 'organization',
    subject: 'Organization settings updated',
    body: 'Branding and general settings were updated by an administrator.',
    channels: ['in_app'],
    payload: {},
    isRead: false,
    createdAt: '2026-08-04T08:15:00+00:00',
    readAt: null,
    ...overrides,
  };
}

/**
 * Six notifications spanning four categories (organization, security,
 * system, user) with three unread and staggered timestamps. Populates both
 * the header bell popover (`NotificationBellFilter`'s All/System/Security
 * options) and the account "Notifications" table with the same before-capture
 * dataset — the account table is the same list read through a paginated view.
 */
export function accountNotifications(): ReadonlyArray<NotificationOutputFixture> {
  return [
    notificationOutput(),
    notificationOutput({
      '@id': '/api/notifications/e2e-notif-2',
      id: 'e2e-notif-2',
      type: 'security',
      category: 'security',
      subject: 'New sign-in from Chrome on Windows',
      body: 'A new session was started from a device we had not seen before.',
      channels: ['in_app', 'email'],
      createdAt: '2026-08-03T19:42:00+00:00',
    }),
    notificationOutput({
      '@id': '/api/notifications/e2e-notif-3',
      id: 'e2e-notif-3',
      type: 'member.added',
      category: 'organization',
      subject: 'New member joined',
      body: 'David Kovacs joined Headquarters — Paris.',
      isRead: true,
      createdAt: '2026-08-02T13:05:00+00:00',
      readAt: '2026-08-02T14:00:00+00:00',
    }),
    notificationOutput({
      '@id': '/api/notifications/e2e-notif-4',
      id: 'e2e-notif-4',
      type: 'update',
      category: 'system',
      subject: 'Scheduled maintenance completed',
      body: 'Platform maintenance finished successfully with no downtime.',
      isRead: true,
      createdAt: '2026-08-01T07:30:00+00:00',
      readAt: '2026-08-01T09:00:00+00:00',
    }),
    notificationOutput({
      '@id': '/api/notifications/e2e-notif-5',
      id: 'e2e-notif-5',
      type: 'password.reset',
      category: 'security',
      subject: 'Password changed',
      body: 'Your account password was changed successfully.',
      channels: ['in_app', 'email'],
      createdAt: '2026-07-31T16:20:00+00:00',
    }),
    notificationOutput({
      '@id': '/api/notifications/e2e-notif-6',
      id: 'e2e-notif-6',
      type: 'user.invited',
      category: 'user',
      subject: 'Invitation sent',
      body: 'You invited helene.morel@fireguard.test to join the organization.',
      isRead: true,
      createdAt: '2026-07-30T11:00:00+00:00',
      readAt: '2026-07-30T11:45:00+00:00',
    }),
  ];
}
