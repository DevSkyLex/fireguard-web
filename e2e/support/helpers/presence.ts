import { expect, type Page, type TestInfo } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  hydraCollection,
  notificationOutput,
  type NotificationOutputFixture,
} from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow } from './appearance';

/** Mutable fake server state shared by isolated browser contexts representing one account. */
export interface PresenceScenario {
  doNotDisturb: boolean;
  revision: number;
  online: boolean;
  readonly notifications: NotificationOutputFixture[];
}

/** Creates a persistent preference and empty inbox for one hermetic scenario. */
export function presenceScenario(): PresenceScenario {
  return { doNotDisturb: false, revision: 0, online: true, notifications: [] };
}

/** Installs ordinary SSE messages with explicit topic matching and real open/close lifecycle. */
async function installPresenceEventSource(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeEventSource extends EventTarget {
      public static readonly CONNECTING = 0;
      public static readonly OPEN = 1;
      public static readonly CLOSED = 2;
      public readyState = FakeEventSource.CONNECTING;
      public constructor(public readonly url: string) {
        super();
        sockets.push(this);
        queueMicrotask(() => {
          if (this.readyState === FakeEventSource.CLOSED) return;
          this.readyState = FakeEventSource.OPEN;
          this.dispatchEvent(new Event('open'));
        });
      }
      public close(): void {
        this.readyState = FakeEventSource.CLOSED;
      }
    }
    const sockets: FakeEventSource[] = [];
    Object.defineProperty(window, 'EventSource', { value: FakeEventSource });
    window.addEventListener('presence-test-frame', (event) => {
      const detail = (event as CustomEvent<{ topic: string; frame: unknown; delivered: number }>)
        .detail;
      for (const socket of sockets) {
        if (
          socket.readyState !== FakeEventSource.CLOSED &&
          new URL(socket.url).searchParams.getAll('topic').includes(detail.topic)
        ) {
          socket.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(detail.frame) }));
          detail.delivered++;
        }
      }
    });
  });
}

/** Installs authenticated transport overrides whose writes persist between reloads and devices. */
export async function mockPresenceScenario(
  page: Page,
  state: PresenceScenario,
  userIndex = 1,
  preferences: Readonly<Record<string, PresenceScenario>> = { [`e2e-member-${userIndex}`]: state },
): Promise<ApiMock> {
  await installPresenceEventSource(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({
    profile: {
      id: `e2e-user-${userIndex}`,
      firstName: userIndex === 1 ? 'Ella' : 'Ines',
      lastName: userIndex === 1 ? 'Uzer' : 'Pector',
    },
  });
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    id: `e2e-member-${userIndex}`,
    userId: `e2e-user-${userIndex}`,
  });
  await page.route(/\/api\/presence\/ping$/, async (route) => {
    await route.fulfill({
      json: {
        memberId: `e2e-member-${userIndex}`,
        lastSeenAt: new Date().toISOString(),
      },
    });
  });
  await page.route(/\/api\/me\/presence-preference$/, async (route) => {
    if (route.request().method() === 'PATCH') {
      const requested = route.request().postDataJSON() as { doNotDisturb: boolean };
      if (state.doNotDisturb !== requested.doNotDisturb) {
        state.doNotDisturb = requested.doNotDisturb;
        state.revision++;
      }
    }
    await route.fulfill({
      json: {
        '@id': '/api/me/presence-preference',
        '@type': 'PresencePreference',
        doNotDisturb: state.doNotDisturb,
        revision: state.revision,
      },
    });
  });
  await page.route(/\/api\/presence(\?.*)?$/, async (route) => {
    const ids = new URL(route.request().url()).searchParams.get('memberIds')?.split(',') ?? [];
    await route.fulfill({
      json: hydraCollection(
        ids.map((memberId) => ({
          memberId,
          online: preferences[memberId]?.online ?? false,
          status: preferences[memberId]?.online
            ? preferences[memberId]?.doNotDisturb
              ? 'do_not_disturb'
              : 'active'
            : 'offline',
          lastSeenAt: preferences[memberId]?.online ? new Date().toISOString() : null,
        })),
      ),
    });
  });
  await page.route(/\/api\/inbox(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        '@id': '/api/inbox',
        '@type': 'Inbox',
        complete: true,
        hasMore: false,
        nextPageCursor: null,
        items: state.notifications.map((notification) => ({
          sourceKey: 'notification',
          id: notification.id,
          kind: 'notification',
          title: notification.subject,
          snippet: notification.body,
          occurredAt: notification.createdAt,
          isRead: notification.isRead,
          organizationId: null,
          targetType: 'notification',
          targetId: notification.id,
          targetKind: null,
        })),
      },
    });
  });
  await page.route(/\/api\/inbox\/unread-count(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: { unreadCount: state.notifications.filter((item) => !item.isRead).length },
    });
  });
  await page.route(/\/api\/notification-types(\?.*)?$/, async (route) => {
    await route.fulfill({ json: hydraCollection([]) });
  });
  return api;
}

/** Delivers an ordinary Mercure frame only once a live subscriber for the exact topic exists. */
export async function deliverPresenceFrame(
  page: Page,
  topic: string,
  frame: unknown,
): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(
        (payload) => {
          const detail = { ...payload, delivered: 0 };
          window.dispatchEvent(new CustomEvent('presence-test-frame', { detail }));
          return detail.delivered;
        },
        { topic, frame },
      ),
    )
    .toBeGreaterThan(0);
}

/** Broadcasts the committed account preference to another connected device. */
export async function deliverPresencePreference(
  page: Page,
  state: PresenceScenario,
): Promise<void> {
  await deliverPresenceFrame(page, '/users/e2e-user-1/presence-preference', {
    type: 'presence.preference.changed',
    doNotDisturb: state.doNotDisturb,
    revision: state.revision,
  });
}

/** Opens the mounted account menu, using the mobile quick actions entry when necessary. */
export async function openPresenceMenu(page: Page, mobile: boolean): Promise<void> {
  const trigger = page.locator('#account-menu-trigger').filter({ visible: true });
  if (mobile && !(await trigger.isVisible())) {
    await page.getByTestId('dashboard-mobile-actions-trigger').click();
  }
  await page.locator('#account-menu-trigger').filter({ visible: true }).click();
}

/** Saves durable browser evidence after verifying no transient compile error or document overflow. */
export async function capturePresence(page: Page, info: TestInfo, name: string): Promise<void> {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  const path = `e2e/artifacts/presence/${info.project.name.replaceAll(' ', '-').toLowerCase()}-${name}.png`;
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

/** Verifies the same confirmed preference contract with keyboard input in the native desktop/mobile control. */
export async function verifyPresenceControl(
  page: Page,
  info: TestInfo,
  mobile: boolean,
): Promise<void> {
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  await openPresenceMenu(page, mobile);
  const control = page.getByRole(mobile ? 'switch' : 'menuitemcheckbox', {
    name: 'Do not disturb',
    exact: true,
  });
  await expect(control).toBeEnabled();
  await expect(control).not.toBeChecked();
  await control.focus();
  await page.keyboard.press('Space');
  await expect(control).toBeChecked();
  await expect(
    page.getByRole('img', { name: 'Do not disturb', exact: true }).first(),
  ).toBeVisible();
  await capturePresence(
    page,
    info,
    `${mobile ? 'drawer' : 'menu'}-${info.title.includes('dark') ? 'dark' : 'light'}`,
  );
  await page.keyboard.press('Escape');
  await expect(control).toBeHidden();
  await expect(page.locator('#account-menu-trigger').filter({ visible: true })).toBeFocused();
  await page.reload();
  await openPresenceMenu(page, mobile);
  await expect(control).toBeChecked();
}

/** Verifies that incoming Mercure events still update the inbox and unread indicator under NPD. */
export async function verifyPresenceNotifications(
  page: Page,
  state: PresenceScenario,
): Promise<void> {
  await page.keyboard.press('Escape');
  await page.goto('/account/notifications');
  await expect(page.getByTestId('account-inbox-list')).toBeVisible();
  const incoming = notificationOutput({
    id: 'presence-incoming',
    subject: 'Inspection updated while do not disturb is enabled',
    createdAt: new Date().toISOString(),
  });
  state.notifications.push(incoming);
  await deliverPresenceFrame(page, '/e2e/user-1', incoming);
  await expect(page.getByTestId('inbox-item').filter({ hasText: incoming.subject })).toBeVisible();
  await expect(
    page.getByTestId('notification-bell-trigger').filter({ visible: true }),
  ).toHaveAccessibleName('Notifications, 1 unread');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  expect(state.doNotDisturb).toBe(true);
}
