import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

const ORGANIZATION = organizationOutput();
const CHANNEL_ID = 'c1';

function json(page: Page, pattern: RegExp, body: unknown): Promise<void> {
  return page.route(pattern, (route) =>
    route.fulfill({ status: 200, contentType: 'application/ld+json', body: JSON.stringify(body) }),
  );
}

function envelope(rows: readonly unknown[]): Record<string, unknown> {
  return { '@id': '/x', '@type': 'Collection', totalItems: rows.length, member: rows };
}

function member(id: string, displayName: string): Record<string, unknown> {
  return {
    '@id': `/api/organizations/${ORGANIZATION.id}/members/${id}`,
    '@type': 'OrganizationMember',
    id,
    organizationId: ORGANIZATION.id,
    userId: `user-${id}`,
    displayName,
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    roleNames: [],
  };
}

function channel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    // A Skolem genid on purpose: nothing may key off `@id`.
    '@id': '/.well-known/genid/abcd1234',
    '@type': 'ChannelOutput',
    id: CHANNEL_ID,
    organization: `/api/organizations/${ORGANIZATION.id}`,
    name: 'Bâtiment Nord',
    participantCount: 2,
    isArchived: false,
    messagesCount: 128,
    unreadCount: 0,
    createdAt: '2026-05-28T09:00:00+00:00',
    updatedAt: '2026-07-21T09:00:00+00:00',
    isFavorite: false,
    ...overrides,
  };
}

/** Everything the panel reads, with per-surface overrides. */
async function mockPanel(
  page: Page,
  overrides: {
    readonly channel?: Record<string, unknown>;
    readonly channels?: readonly unknown[];
    readonly participants?: readonly unknown[];
    readonly activity?: readonly unknown[];
    readonly pins?: readonly unknown[];
    readonly files?: readonly unknown[];
    readonly links?: readonly unknown[];
    readonly members?: readonly unknown[];
  } = {},
): Promise<void> {
  await json(
    page,
    /\/api\/organizations\/[^/]+\/members(\?.*)?$/,
    envelope(overrides.members ?? [member('mem-1', 'Daniel Anderson')]),
  );
  await json(page, /\/api\/channels(\?.*)?$/, envelope(overrides.channels ?? [channel()]));
  await json(page, new RegExp(`/api/channels/${CHANNEL_ID}$`), overrides.channel ?? channel());
  await json(
    page,
    new RegExp(`/api/channels/${CHANNEL_ID}/participants$`),
    envelope(
      overrides.participants ?? [
        {
          '@id': '/.well-known/genid/p1',
          '@type': 'ChannelParticipantOutput',
          memberId: 'mem-1',
          role: 'Coordinator',
          source: 'manual',
          addedAt: '2026-05-28T09:00:00+00:00',
        },
      ],
    ),
  );
  await json(
    page,
    /\/api\/conversations\/[^/]+\/activity(\?.*)?$/,
    envelope(overrides.activity ?? []),
  );
  await json(page, /\/api\/conversations\/[^/]+\/messages(\?.*)?$/, envelope([]));
  await json(
    page,
    /\/api\/conversations\/[^/]+\/pinned-messages(\?.*)?$/,
    envelope(overrides.pins ?? []),
  );
  await json(
    page,
    /\/api\/conversations\/[^/]+\/attachments(\?.*)?$/,
    envelope(overrides.files ?? []),
  );
  await json(page, /\/api\/conversations\/[^/]+\/links(\?.*)?$/, envelope(overrides.links ?? []));
}

/**
 * Signs in, then layers the panel mocks on top.
 *
 * Order matters: Playwright gives precedence to the most recently registered
 * route, and `ApiMock` installs catch-alls that would otherwise answer these
 * endpoints with empty collections.
 */
async function signIn(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
}

async function openChannel(page: Page): Promise<void> {
  await page.goto(`/organizations/${ORGANIZATION.id}/workspace/channels/${CHANNEL_ID}`);
}

/**
 * The mono-active `PANEL_SLOT` contribution: the channel info panel.
 */
test.describe('Workspace info panel', () => {
  test('claims the panel slot on a channel, at the prototype width', async ({ page }) => {
    await signIn(page);
    await mockPanel(page);
    await openChannel(page);

    const panel = page.locator('#workspace-panel');
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    const shell = await page.locator('#workspace-layout').boundingBox();

    expect(Math.round(box?.width ?? 0)).toBe(330);
    // The column must fill the shell — an aside inside the outlet's host does
    // not stretch on its own.
    expect(Math.round(box?.height ?? 0)).toBe(Math.round(shell?.height ?? 0));
  });

  test('leaves the slot empty away from a channel', async ({ page }) => {
    await signIn(page);
    await mockPanel(page);

    const workspace = new WorkspacePage(page);
    await workspace.goto(ORGANIZATION.id);

    await expect(workspace.shell).toBeVisible();
    await expect(page.locator('#workspace-panel')).toHaveCount(0);
    await expect(page.getByTestId('channel-info-toggle')).toHaveCount(0);
  });

  test('renders the channel meta from the API', async ({ page }) => {
    await signIn(page);
    await mockPanel(page, {
      channel: channel({
        createdByMember: `/api/organizations/${ORGANIZATION.id}/members/mem-1`,
        lastMessageAt: '2026-07-21T14:20:00+00:00',
      }),
    });
    await openChannel(page);

    const panel = page.locator('#workspace-panel');

    // The creator arrives as a non-dereferenceable member IRI; the directory
    // port is what turns it into a name.
    await expect(panel).toContainText('Daniel Anderson');
    await expect(panel).toContainText('128');
    await expect(panel).toContainText('Active');
  });

  test('resolves participants through the member directory', async ({ page }) => {
    await signIn(page);
    await mockPanel(page, {
      members: [member('mem-1', 'Daniel Anderson'), member('mem-2', 'Amélie Rivet')],
      participants: [
        {
          '@id': '/.well-known/genid/p1',
          '@type': 'ChannelParticipantOutput',
          memberId: 'mem-1',
          role: 'Coordinator',
          source: 'manual',
          addedAt: '2026-05-28T09:00:00+00:00',
        },
        {
          '@id': '/.well-known/genid/p2',
          '@type': 'ChannelParticipantOutput',
          memberId: 'mem-2',
          source: 'team',
          addedAt: '2026-06-01T09:00:00+00:00',
        },
      ],
    });
    await openChannel(page);

    const members = page.getByTestId('channel-info-panel-members');
    await expect(members).toContainText('Daniel Anderson');
    await expect(members).toContainText('Amélie Rivet');
    // Membership pulled in by a team is labelled, not silently identical.
    await expect(members).toContainText('Team');
  });

  test('grades the activity strip against its own busiest day', async ({ page }) => {
    const counts = [0, 1, 9].concat(Array.from({ length: 23 }, () => 0));
    await signIn(page);
    await mockPanel(page, {
      activity: counts.map((count, index) => ({
        '@id': `/.well-known/genid/a${index}`,
        '@type': 'ConversationActivityBucketOutput',
        bucket: `2026-07-${String(index + 1).padStart(2, '0')}`,
        count,
      })),
    });
    await openChannel(page);

    const cells = page.locator('app-channel-activity-heatmap span[title]');
    await expect(cells).toHaveCount(26);
    // The strip carries no readable meaning, so the summary is what assistive
    // tech gets.
    await expect(page.getByTestId('channel-activity-summary')).toContainText('10 messages');
  });

  test('fetches a tab only when it is opened', async ({ page }) => {
    let pinRequests = 0;
    await signIn(page);
    await mockPanel(page);
    await page.route(/\/api\/conversations\/[^/]+\/pinned-messages(\?.*)?$/, (route) => {
      pinRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify(
          envelope([
            {
              '@id': '/.well-known/genid/pm1',
              '@type': 'MessageOutput',
              id: 'm1',
              conversation: `/api/conversations/${CHANNEL_ID}`,
              authorMember: `/api/organizations/${ORGANIZATION.id}/members/mem-1`,
              body: 'Procédure de contrôle trimestriel.',
              mentions: [],
              isDeleted: false,
              attachments: [],
              reactions: [],
              isSaved: false,
              replyCount: 0,
              references: [],
              pinnedAt: '2026-07-10T09:00:00+00:00',
              createdAt: '2026-07-01T09:00:00+00:00',
              updatedAt: '2026-07-01T09:00:00+00:00',
            },
          ]),
        ),
      });
    });

    await openChannel(page);
    await expect(page.getByTestId('channel-info-panel')).toBeVisible();
    expect(pinRequests).toBe(0);

    await page.getByRole('tab', { name: 'Pins' }).click();
    await expect(page.getByTestId('channel-info-panel-pins')).toContainText(
      'Procédure de contrôle trimestriel.',
    );
    expect(pinRequests).toBe(1);

    // Leaving and returning must not refetch.
    await page.getByRole('tab', { name: 'Info' }).click();
    await page.getByRole('tab', { name: 'Pins' }).click();
    expect(pinRequests).toBe(1);
  });

  test('shows an empty state per tab', async ({ page }) => {
    await signIn(page);
    await mockPanel(page);
    await openChannel(page);

    await page.getByRole('tab', { name: 'Files' }).click();
    await expect(page.getByTestId('channel-info-panel-files')).toContainText('No files shared yet');

    await page.getByRole('tab', { name: 'Links' }).click();
    await expect(page.getByTestId('channel-info-panel-links')).toContainText('No links shared yet');
  });

  test('opens and closes from the conversation header', async ({ page }) => {
    await signIn(page);
    await mockPanel(page);
    await openChannel(page);

    const toggle = page.getByTestId('channel-info-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#workspace-panel')).toHaveCount(0);

    await toggle.click();

    await expect(page.locator('#workspace-panel')).toBeVisible();
  });

  test('becomes a full-bleed overlay with a way back below the desktop breakpoint', async ({
    page,
  }) => {
    await signIn(page);
    await mockPanel(page);
    await openChannel(page);
    await expect(page.locator('#workspace-panel')).toBeVisible();

    await page.setViewportSize({ width: 900, height: 800 });

    const panel = page.locator('#workspace-panel');
    const box = await panel.boundingBox();

    expect(Math.round(box?.width ?? 0)).toBe(900);
    // The desktop column has no header; the overlay needs one.
    await expect(page.getByTestId('channel-info-panel-close')).toBeVisible();

    await page.getByTestId('channel-info-panel-close').click();

    await expect(page.locator('#workspace-panel')).toHaveCount(0);
  });

  test('keeps the heatmap compact when the panel goes full width', async ({ page }) => {
    await signIn(page);
    await mockPanel(page, {
      activity: Array.from({ length: 26 }, (_unused, index) => ({
        '@id': `/.well-known/genid/a${index}`,
        '@type': 'ConversationActivityBucketOutput',
        bucket: `2026-07-${String(index + 1).padStart(2, '0')}`,
        count: index,
      })),
    });
    await openChannel(page);
    await expect(page.locator('#workspace-panel')).toBeVisible();

    await page.setViewportSize({ width: 900, height: 800 });

    const cell = await page
      .locator('app-channel-activity-heatmap span[title]')
      .first()
      .boundingBox();

    // `1fr` columns would blow these up to ~66px on a full-width overlay.
    expect(Math.round(cell?.width ?? 0)).toBe(16);
  });
});
