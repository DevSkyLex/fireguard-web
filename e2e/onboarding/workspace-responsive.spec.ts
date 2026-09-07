import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { inProgressOnboardingOutput } from '../support/fixtures/api-fixtures';
import {
  workspaceInvitation,
  workspaceOptions,
  workspaceRequest,
} from '../support/fixtures/workspace-fixtures';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

const CAPTURES = 'e2e/artifacts/join-workspace-20260907';
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
  { width: 1440, height: 500 },
];

for (const viewport of VIEWPORTS) {
  for (const dark of [false, true]) {
    test(`keeps workspace choices usable at ${viewport.width} by ${viewport.height} in ${dark ? 'dark' : 'light'} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({
        organizations: [],
        onboarding: inProgressOnboardingOutput(),
      });
      await api.mockWorkspaceOptions(() =>
        workspaceOptions({
          invitations: [workspaceInvitation()],
          requests: [
            workspaceRequest({ organizationName: 'West regional facilities compliance team' }),
          ],
        }),
      );
      const workspace = new WorkspacePage(page);
      await workspace.goto();
      await expect(workspace.title).toHaveText('Your workspace');
      await expect(workspace.accept).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(workspace.root);
      const content = page.locator('#split-layout-content-box');
      expect((await content.boundingBox())?.width ?? Infinity).toBeLessThanOrEqual(576);
      const showcase = page.locator('#split-layout-showcase');
      if (viewport.width >= 1024) {
        await expect(showcase).toBeVisible();
        expect((await showcase.boundingBox())?.width).toBeCloseTo(viewport.width / 2, 0);
      } else await expect(showcase).toBeHidden();
      await page.screenshot({
        path: `${CAPTURES}/${viewport.width}x${viewport.height}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      for (const action of [
        workspace.accept,
        workspace.request,
        workspace.cancel,
        workspace.create,
      ]) {
        // Each action must own the viewport while its scroll position is measured.
        // eslint-disable-next-line no-await-in-loop
        await test.step('Reach the next workspace action', async () => {
          await action.scrollIntoViewIfNeeded();
          await expect(action).toBeInViewport();
          expect((await action.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
        });
      }
      await workspace.create.focus();
      await expect(workspace.create).toBeFocused();
      await expect(workspace.create).toBeInViewport();
    });
  }
}
