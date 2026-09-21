import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { importJobOutput } from '../fixtures/import-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { ImportsPage } from '../pages/imports.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Reuses one import through observation loss and explicit resumption. */
export async function verifyImportResumption(page: Page, info: TestInfo): Promise<void> {
  await page.clock.install();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const stalled = importJobOutput({
    status: 'failed',
    processedRows: 7,
    successfulRows: 7,
    canResume: true,
  });
  const resumed = { ...stalled, status: 'processing' as const, canResume: false };
  const completed = {
    ...resumed,
    status: 'completed' as const,
    processedRows: 12,
    successfulRows: 12,
  };
  let current = stalled;
  let resumeRequests = 0;
  await api.mockImportJobList([stalled]);
  await page.route(new RegExp(`/api/imports/${stalled.id}(\\?.*)?$`), (route) =>
    route.fulfill({ json: current }),
  );
  await page.route(new RegExp(`/api/imports/${stalled.id}/resume$`), async (route) => {
    expect(route.request().method()).toBe('POST');
    resumeRequests++;
    current = resumed;
    await route.fulfill({ status: 202, json: resumed });
  });
  const imports = new ImportsPage(page);
  await imports.goto(E2E_ORGANIZATION_ID);
  await imports.openReport(stalled.originalFilename);
  await expect(imports.report).toBeVisible();
  await expect(imports.resume).toBeEnabled();
  await expect(imports.summary).toContainText('7');
  await expectNoHorizontalOverflow(page);
  const path = `e2e/artifacts/reliability/import-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${path}-resume.png`, fullPage: true, animations: 'disabled' });
  if (info.project.name === 'chromium') {
    await imports.resume.focus();
    await expect(imports.resume).toBeFocused();
    await page.keyboard.press('Enter');
  } else {
    await imports.resume.click();
  }
  await expect(imports.resume).toBeHidden();
  await expect(imports.summary).toContainText('7');
  current = completed;
  await page.clock.runFor(2600);
  await expect(imports.summary).toContainText('12');
  expect(resumeRequests).toBe(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${path}-completed.png`, fullPage: true, animations: 'disabled' });
}
