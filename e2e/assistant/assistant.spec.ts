import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The organization assistant (`/assistant`).
 *
 * The behaviour worth pinning is the wait: an answer comes back `pending` with
 * an empty body and fills in over Mercure, so a blank bubble would read as a
 * broken assistant rather than a working one.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const message = (id: string, role: string, body: string, status: string, createdAt: string) => ({
  '@id': `/api/assistant/messages/${id}`,
  '@type': 'AssistantMessage',
  id,
  threadId: 't1',
  organizationId: 'org',
  role,
  body,
  status,
  errorCode: null,
  tokenCount: null,
  createdAt,
  completedAt: status === 'completed' ? createdAt : null,
});

async function landOnAssistant(page: Page): Promise<{ asked: string[] }> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  const asked: string[] = [];

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  const base = `${API_BASE_URL}/api/organizations/${organization.id}/assistant`;

  await page.route(`${base}/threads**`, async (route) => {
    const url: string = route.request().url();

    if (url.includes('/subscription')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ token: 'jwt', topic: 'assistant/t1' }),
      });
      return;
    }

    if (url.includes('/messages')) {
      const body = route.request().postDataJSON() as { body: string };
      asked.push(body.body);
      await route.fulfill({
        status: 201,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': '/api/assistant/ask',
          '@type': 'AskAssistantQuestion',
          threadId: 't1',
          organizationId: organization.id,
          userMessage: message('u2', 'user', body.body, 'completed', '2026-07-01T10:05:00+00:00'),
          // The answer starts empty and streams in.
          assistantMessage: message('a2', 'assistant', '', 'pending', '2026-07-01T10:05:01+00:00'),
        }),
      });
      return;
    }

    if (/\/threads\/[\w-]+$/.test(new URL(url).pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@id': '/api/assistant/threads/t1',
          '@type': 'AssistantThread',
          id: 't1',
          organizationId: organization.id,
          memberId: 'm1',
          title: 'Overdue extinguishers',
          model: 'local',
          createdAt: '2026-07-01T09:00:00+00:00',
          updatedAt: '2026-07-01T10:00:00+00:00',
          lastMessageAt: '2026-07-01T10:00:00+00:00',
          messages: [
            message(
              'u1',
              'user',
              'Which sites are overdue?',
              'completed',
              '2026-07-01T09:59:00+00:00',
            ),
            message(
              'a1',
              'assistant',
              'Southbank Works has 5 overdue assets.',
              'completed',
              '2026-07-01T10:00:00+00:00',
            ),
          ],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          {
            '@id': '/api/assistant/threads/t1',
            '@type': 'AssistantThread',
            id: 't1',
            organizationId: organization.id,
            memberId: 'm1',
            title: 'Overdue extinguishers',
            model: 'local',
            createdAt: '2026-07-01T09:00:00+00:00',
            updatedAt: '2026-07-01T10:00:00+00:00',
            lastMessageAt: '2026-07-01T10:00:00+00:00',
            messages: [],
          },
        ],
        totalItems: 1,
      }),
    });
  });

  await page.goto(`/organizations/${organization.id}/assistant`);
  await expect(page.locator('#assistant')).toBeVisible();

  return { asked };
}

test.describe('Organization assistant', () => {
  test('lists past conversations', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnAssistant(page);

    await expect(page.getByTestId('assistant-thread')).toHaveCount(1);
    await expect(page.getByText('Overdue extinguishers')).toBeVisible();
  });

  test('opens a conversation with both sides of the exchange', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnAssistant(page);

    await page.getByTestId('assistant-thread').click();

    await expect(page.getByTestId('assistant-message')).toHaveCount(2);
    await expect(page.getByText('Which sites are overdue?')).toBeVisible();
    await expect(page.getByText('Southbank Works has 5 overdue assets.')).toBeVisible();
  });

  // A pending answer has no body; a blank bubble would read as broken.
  test('shows the wait while an answer is being produced', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { asked } = await landOnAssistant(page);

    await page.getByTestId('assistant-thread').click();
    await page.getByTestId('assistant-composer').fill('And which are due soon?');
    await page.getByTestId('assistant-send').locator('button').click();

    await expect.poll(() => asked).toEqual(['And which are due soon?']);
    await expect(page.getByTestId('assistant-thinking')).toBeVisible();
  });

  // A second question must not race the first while it is still answering.
  test('refuses a new question until the answer lands', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnAssistant(page);

    await page.getByTestId('assistant-thread').click();
    await page.getByTestId('assistant-composer').fill('First question');
    await page.getByTestId('assistant-send').locator('button').click();

    await expect(page.getByTestId('assistant-thinking')).toBeVisible();
    await page.getByTestId('assistant-composer').fill('Second question');

    await expect(page.getByTestId('assistant-send').locator('button')).toBeDisabled();
  });
});
