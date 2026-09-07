import { expect, test } from '@playwright/test';
import {
  E2E_ORGANIZATION_ID,
  inProgressOnboardingOutput,
  onboardingOutput,
} from '../support/fixtures/api-fixtures';
import {
  workspaceInvitation,
  workspaceOptions,
  workspaceOrganization,
  workspaceRequest,
} from '../support/fixtures/workspace-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

test.describe('Explicit workspace selection', () => {
  test('requires mailbox verification before displaying domain matches', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [],
      onboarding: inProgressOnboardingOutput(),
    });
    let verified = false;
    const confirmations: unknown[] = [];
    await api.mockWorkspaceOptions(() =>
      workspaceOptions({
        emailProofRequired: !verified,
        organizations: verified ? [workspaceOrganization()] : [],
      }),
    );
    await api.mockWorkspaceEmailOwnership((body) => {
      confirmations.push(body);
      verified = true;
    });
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await expect(workspace.request).toBeHidden();
    await expect(
      workspace.root.getByRole('heading', { name: 'Verify your email address' }),
    ).toBeVisible();
    await workspace.root.getByRole('button', { name: 'Send verification code' }).click();
    await expect(page.getByLabel('Verification code')).toBeFocused();
    await page.getByLabel('Verification code').fill('123456');
    await expect(workspace.request).toBeVisible();
    await expect(page.getByLabel('Verification code')).toBeHidden();
    await expect(workspace.title).toBeFocused();
    expect(confirmations).toEqual([{ challengeToken: 'a'.repeat(64), code: '123456' }]);
  });

  test('shows the immediate admission role before an explicit join', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    await api.mockWorkspaceOptions(() =>
      workspaceOptions({
        organizations: [workspaceOrganization({ actions: ['join'], roleLabel: 'Member' })],
      }),
    );
    let admissions = 0;
    await api.mockWorkspaceImmediateAdmission(E2E_ORGANIZATION_ID, () => {
      admissions += 1;
    });
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await expect(workspace.root.getByText('Member', { exact: false })).toBeVisible();
    expect(admissions).toBe(0);
    await api.mockOnboarding(onboardingOutput());
    await workspace.root.getByRole('button', { name: 'Join organization', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}`));
    expect(admissions).toBe(1);
  });

  test('keeps invitations first and creates nothing while discovering workspaces', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [],
      onboarding: inProgressOnboardingOutput(),
    });
    await api.mockWorkspaceOptions(() =>
      workspaceOptions({ invitations: [workspaceInvitation()] }),
    );
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/api\/(organizations|onboarding)/.test(request.url()))
        writes.push(request.url());
    });
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await expect(workspace.title).toHaveText('Your workspace');
    await expect(workspace.accept).toBeVisible();
    await expect(workspace.request).toBeVisible();
    const invitation = await page.locator('#workspace-invitations-title').boundingBox();
    const organizations = await page.locator('#workspace-organizations-title').boundingBox();
    expect(invitation?.y).toBeLessThan(organizations?.y ?? 0);
    expect(writes).toEqual([]);
  });

  test('accepts an invitation explicitly and leaves onboarding without starting creation', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOnboarding(inProgressOnboardingOutput());
    await api.mockWorkspaceOptions(() =>
      workspaceOptions({ invitations: [workspaceInvitation()], organizations: [] }),
    );
    let acceptCount = 0;
    await api.mockWorkspaceInvitationAcceptance('e2e-invitation', E2E_ORGANIZATION_ID, () => {
      acceptCount += 1;
    });
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await expect(workspace.accept).toBeVisible();
    expect(acceptCount).toBe(0);
    await api.mockOnboarding(onboardingOutput());
    await workspace.accept.click();
    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}`));
    expect(acceptCount).toBe(1);
  });

  test('requests access, tracks the pending request and cancels it without receiving membership', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [],
      onboarding: inProgressOnboardingOutput(),
    });
    let options = workspaceOptions();
    await api.mockWorkspaceOptions(() => options);
    const pending = workspaceRequest();
    await api.mockWorkspaceRequestAction('request', E2E_ORGANIZATION_ID, pending, () => {
      options = workspaceOptions({
        organizations: [workspaceOrganization({ actions: ['view_request'] })],
        requests: [pending],
      });
    });
    await api.mockWorkspaceRequestAction(
      'cancel',
      E2E_ORGANIZATION_ID,
      workspaceRequest({ status: 'cancelled', actions: [] }),
      () => {
        options = workspaceOptions({
          requests: [workspaceRequest({ status: 'cancelled', actions: [] })],
        });
      },
    );
    const workspace = new WorkspacePage(page);
    await workspace.goto('/account/security');
    await workspace.request.click();
    await expect(workspace.root.getByText('Awaiting approval', { exact: true })).toBeVisible();
    await workspace.root.getByRole('link', { name: 'View my request' }).click();
    await expect(page).toHaveURL(/\/onboarding\/requests\?returnUrl=%2Faccount%2Fsecurity/);
    await expect(workspace.title).toHaveText('Your membership requests');
    await workspace.cancel.click();
    await expect(workspace.root.getByText('Cancelled', { exact: true })).toBeVisible();
    await expect(workspace.cancel).toBeHidden();
    await expect(page).toHaveURL(/\/onboarding\/requests/);
  });

  test('distinguishes discovery failure from no match and permits an explicit retry', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [],
      onboarding: inProgressOnboardingOutput(),
    });
    await api.mockWorkspaceOptions(() => workspaceOptions(), 500);
    const workspace = new WorkspacePage(page);
    await workspace.goto();
    await expect(
      workspace.root.getByText('We could not check your workspaces. Please try again.'),
    ).toBeVisible();
    await expect(
      workspace.root.getByText('No organization available for this email', { exact: true }),
    ).toBeHidden();
    await api.mockWorkspaceOptions(() => workspaceOptions({ organizations: [] }));
    await workspace.retry.click();
    await expect(
      workspace.root.getByText('No organization available for this email', { exact: true }),
    ).toBeVisible();
    await expect(workspace.retry).toBeHidden();
  });

  test('starts creation only after the user chooses it and preserves the return destination', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [],
      onboarding: inProgressOnboardingOutput(),
    });
    await api.mockWorkspaceOptions(() => workspaceOptions());
    const creationBodies: unknown[] = [];
    await api.mockOnboardingStart(inProgressOnboardingOutput(), (body) =>
      creationBodies.push(body),
    );
    const workspace = new WorkspacePage(page);
    await workspace.goto('/account/security');
    await expect(workspace.create).toBeVisible();
    expect(creationBodies).toEqual([]);
    await workspace.create.click();
    await expect(page).toHaveURL(/\/onboarding\/create\?returnUrl=%2Faccount%2Fsecurity/);
    await expect(page.getByTestId('onboarding-org-name')).toBeVisible();
    expect(creationBodies).toEqual([{ reset: false, intent: 'create' }]);
  });
});
