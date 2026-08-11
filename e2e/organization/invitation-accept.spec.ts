import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_INVITATION_TOKEN,
  acceptedOrganizationMemberOutput,
  invitationPreviewOutput,
} from '../support/fixtures/invitation-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationInvitationAcceptPage } from '../support/pages/organization-invitation-accept.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/8ab87c77-49b6-4d36-a37e-080efde2fd91/scratchpad/screenshots';

test.describe('Invitation accept preview', () => {
  test('renders the pending invitation card with organization, inviter, invited email and expiry', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);

    await expect(invitationAccept.card).toBeVisible();
    await expect(invitationAccept.card).toContainText('E2E Organization');
    await expect(invitationAccept.card).toContainText('Ella Uzer');
    await expect(invitationAccept.card).toContainText('invitee@fireguard.test');
    await expect(invitationAccept.acceptSubmit).toBeVisible();
  });

  test('shows the missing-token card when the link has no token', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto();

    await expect(invitationAccept.missingToken).toBeVisible();
  });

  test('shows the unavailable card, with a paired icon and label, for an expired invitation', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockInvitationPreview(
      E2E_INVITATION_TOKEN,
      invitationPreviewOutput({ status: 'expired' }),
    );
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);

    await expect(invitationAccept.unavailable).toBeVisible();
    await expect(invitationAccept.unavailable).toContainText('Expired');
    await expect(invitationAccept.unavailable.locator('svg')).toBeVisible();
    await expect(invitationAccept.acceptSubmit).toHaveCount(0);
  });

  test('shows the preview-error card for an invalid or unknown token', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockInvitationPreviewError(E2E_INVITATION_TOKEN);
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);

    await expect(invitationAccept.previewError).toBeVisible();
    await expect(invitationAccept.acceptSubmit).toHaveCount(0);
  });
});

test.describe('Invitation accept flow', () => {
  test('accepts the invitation as a signed-in visitor and shows the success card linking to the organization', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    await api.mockInvitationAccept(acceptedOrganizationMemberOutput());
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);
    await expect(invitationAccept.card).toBeVisible();

    await invitationAccept.accept();

    await expect(invitationAccept.success).toBeVisible();
    await expect(invitationAccept.success).toContainText('E2E Organization');
    await expect(invitationAccept.openOrganizationLink).toHaveAttribute(
      'href',
      `/organizations/${E2E_ORGANIZATION_ID}`,
    );
  });

  test('shows a destructive alert without leaving the card when acceptance fails', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    await api.mockInvitationAcceptError({
      detail: 'This invitation was revoked by an administrator.',
    });
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);
    await invitationAccept.accept();

    await expect(invitationAccept.acceptError).toBeVisible();
    await expect(invitationAccept.acceptError).toContainText(
      'This invitation was revoked by an administrator.',
    );
    await expect(invitationAccept.acceptError.locator('svg')).toBeVisible();
    await expect(invitationAccept.card).toBeVisible();
  });

  test('redirects an unauthenticated visitor to sign-in with the accept page preserved as returnUrl', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);
    await expect(invitationAccept.card).toBeVisible();

    await invitationAccept.accept();

    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=/);
    const url = new URL(page.url());
    expect(url.searchParams.get('returnUrl')).toBe(
      `/organizations/invitations/accept?token=${E2E_INVITATION_TOKEN}`,
    );
  });
});

test.describe('Invitation accept appearance', () => {
  test('renders the pending card on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);

    await expect(invitationAccept.card).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/invitation-accept-pending-light-desktop.png`,
    });
  });

  test('renders the pending card at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInvitationPreview(E2E_INVITATION_TOKEN, invitationPreviewOutput());
    const invitationAccept = new OrganizationInvitationAcceptPage(page);

    await invitationAccept.goto(E2E_INVITATION_TOKEN);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(invitationAccept.card).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/invitation-accept-pending-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});
