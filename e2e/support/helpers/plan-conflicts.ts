import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { auditEventOutput } from '../fixtures/audit-fixtures';
import { equipmentOutput } from '../fixtures/equipment-fixtures';
import {
  E2E_FACILITY_ID,
  E2E_FACILITY_CHILD_ID,
  facilityOutput,
  facilityChildOutput,
  facilityZoneCandidateOutput,
  facilityAttachmentOutput,
  facilityPlanOverlayOutput,
} from '../fixtures/facility-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { AuditPage } from '../pages/audit.page';
import { FacilitiesPage } from '../pages/facilities.page';
import { expectNoHorizontalOverflow } from './appearance';

/** Exercises a conflicting write, refreshed geometry, preserved draft, retry and audit disclosure. */
export async function verifyPlanConflicts(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput({ hasChildren: true }));
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
    equipment: [equipmentOutput()],
  });
  await api.mockFacilityPlans(E2E_FACILITY_ID, [facilityAttachmentOutput()]);
  await api.mockFacilityChildren(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
    facilityChildOutput(),
    facilityZoneCandidateOutput(),
  ]);
  await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [facilityChildOutput()]);
  let reads = 0;
  await page.route(/\/facilities\/e2e-facility-1\/plan-overlay(?:\?.*)?$/, async (route) => {
    reads++;
    const overlay = facilityPlanOverlayOutput();
    await route.fulfill({
      json:
        reads === 1
          ? overlay
          : {
              ...overlay,
              zones: overlay.zones.map((zone) =>
                Object.assign({}, zone, {
                  points: [
                    [0.05, 0.05],
                    [0.7, 0.05],
                    [0.7, 0.7],
                  ],
                }),
              ),
            },
    });
  });
  const writes: unknown[] = [];
  await page.route(
    new RegExp(`/facilities/${E2E_FACILITY_CHILD_ID}/plan-geometry$`),
    async (route) => {
      writes.push(route.request().postDataJSON());
      await route.fulfill(
        writes.length === 1
          ? {
              status: 412,
              json: {
                status: 412,
                code: 'resource_revision_conflict',
                detail: 'Conflit de révision.',
              },
            }
          : { json: facilityChildOutput() },
      );
    },
  );
  const facilities = new FacilitiesPage(page);
  await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
  await facilities.plansTab.click();
  await expect(facilities.editorToolbar).toBeVisible();
  const panelOpener = page.getByRole('button', { name: 'Zones and equipment', exact: true });
  if (await panelOpener.isVisible()) await panelOpener.click();
  await facilities.selectZone();
  await facilities.zoneEditButton.click();
  await facilities.fillZoneVertex(0, '37.5', '25.0');
  await facilities.zoneGeometrySubmit.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(
      'The resource changed. Check the refreshed plan before saving again. Your coordinates have been kept.',
    ),
  ).toBeVisible();
  await expect.poll(() => reads).toBe(2);
  await expect(
    facilities.zoneGeometryRows.first().getByTestId('facility-plan-zone-geometry-row-x'),
  ).toHaveValue('37.5');
  await expect(facilities.zoneGeometryRows).toHaveCount(4);
  await expect(facilities.zoneGeometrySubmit).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  const suffix = info.project.name.replaceAll(' ', '-').toLowerCase();
  await page.screenshot({
    path: `e2e/artifacts/reliability/plans-${suffix}-conflict.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await facilities.zoneGeometrySubmit.click();
  await expect(facilities.zoneGeometryDialog).toBeHidden();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);

  await api.mockAuditEventList(E2E_ORGANIZATION_ID, [
    auditEventOutput({
      action: 'facility.plan_geometry_changed',
      occurredAt: new Date().toISOString(),
      metadata: {
        operation: 'moved',
        revision: 7,
        attachment_id: 'Ground floor',
        previous_attachment_id: 'Ground floor',
      },
    }),
  ]);
  const audit = new AuditPage(page);
  await audit.goto(E2E_ORGANIZATION_ID);
  await expect(
    audit.root.getByText('Zone outline changed').filter({ visible: true }),
  ).toBeVisible();
  await audit.root
    .getByTestId('audit-event-table-expand')
    .filter({ visible: true })
    .first()
    .click();
  await expect(audit.root.getByText('Moved on plan').filter({ visible: true })).toBeVisible();
  await expect(audit.root.getByText('Jamie Rivera').filter({ visible: true })).toBeVisible();
  if (info.project.name === 'Mobile Chrome') {
    const card = await audit.root.getByTestId('audit-event-table-row-card').boundingBox();
    const pagination = await audit.root.locator('app-collection-pagination').boundingBox();
    expect(card).not.toBeNull();
    expect(pagination).not.toBeNull();
    if (!card || !pagination) throw new Error('Audit card or pagination bounds are unavailable');
    expect(card.y + card.height).toBeLessThanOrEqual(pagination.y);
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `e2e/artifacts/reliability/plans-${suffix}-audit.png`,
    fullPage: true,
    animations: 'disabled',
  });
}
