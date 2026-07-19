import { expect, test, type Request } from '@playwright/test';
import { mercureSubscriptionOutput, organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Notification live stream — how the subscriber JWT reaches the Mercure hub.
 *
 * The suite is hermetic (the hub is a `page.route` stub), so this cannot prove
 * the hub *accepts* the credential — that is covered by the API-side provider
 * tests and by the transport unit specs. What it does pin, and what no unit
 * test can, is the shape of the request the real browser actually emits: the
 * token must travel in a header and must never appear in the URL, where it
 * would be captured by hub access logs, browser history, and `Referer`.
 */
test.describe('Notification stream credential', () => {
  test('sends the subscriber token as a header, never in the URL', async ({ page }) => {
    const organization = organizationOutput();
    const subscription = mercureSubscriptionOutput();

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    const hubRequest: Promise<Request> = page.waitForRequest(
      (request: Request) =>
        request.url().includes('/.well-known/mercure') && 'GET' === request.method(),
    );

    await page.goto('/');

    const request: Request = await hubRequest;
    const url = new URL(request.url());

    expect(url.searchParams.get('topic')).toBe(subscription.topic);
    expect(url.searchParams.get('authorization')).toBeNull();
    expect(request.url()).not.toContain(subscription.token);

    expect(await request.headerValue('authorization')).toBe(`Bearer ${subscription.token}`);
  });
});
