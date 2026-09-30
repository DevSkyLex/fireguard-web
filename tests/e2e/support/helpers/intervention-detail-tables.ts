import { expect, type Locator, type Page } from '@playwright/test';
import {
  currentOrganizationMemberProfileOutput,
  E2E_ORGANIZATION_ID,
} from '../fixtures/api-fixtures';
import { equipmentOutput } from '../fixtures/equipment-fixtures';
import { facilityOutput } from '../fixtures/facility-fixtures';
import { inspectionOutput } from '../fixtures/inspection-fixtures';
import { interventionOutput, interventionWorkItemOutput } from '../fixtures/intervention-fixtures';
import { ApiMock } from '../mocks/api-mock';

/** Registers isolated read fixtures for the intervention table regression matrix. */
export async function arrangeInterventionTables(
  page: Page,
  actions = true,
  configure?: (api: ApiMock) => Promise<void>,
): Promise<string> {
  const api = new ApiMock(page);
  const base = interventionOutput();
  const intervention = interventionOutput({
    name: 'Table regression intervention',
    status: 'in_progress',
    description: 'Details '.repeat(80),
    workItemsCount: 1,
    proposedChangesCount: 1,
    facilitiesCount: 1,
    equipmentCount: 1,
    inspectionsCount: 1,
    allowedActions: { ...base.allowedActions, canMutateChanges: actions },
  });
  await api.mockAuthenticatedSession();
  if (!actions)
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [
        'organization.interventions.read',
        'organization.equipment.read',
        'organization.facilities.read',
        'organization.inspections.read',
      ],
    });
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(intervention.id, [
    interventionWorkItemOutput({ target: 'Emergency pump' }),
  ]);
  await api.mockInterventionChanges(intervention.id, [
    {
      '@id': '/api/intervention-changes/table-change',
      '@type': 'InterventionChange',
      id: 'table-change',
      intervention: intervention['@id'],
      workItem: null,
      resource: '/api/equipment/table-equipment',
      status: 'proposed',
      revision: 1,
      patch: {
        locationLabel: 'A particularly long equipment location, '.repeat(12),
        status: 'decommissioned',
      },
      createdAt: intervention.createdAt,
      updatedAt: intervention.updatedAt,
    },
  ]);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionFacilities(intervention.id, [facilityOutput()]);
  await api.mockInterventionEquipment(intervention.id, [equipmentOutput()]);
  await api.mockInterventionInspections(intervention.id, [inspectionOutput()]);
  await configure?.(api);
  return `/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`;
}

/**
 * Function arrangePaginatedWorkItems
 *
 * @description
 * Registers 32 tasks with long labels and unknown, zero and independently recorded effort.
 * The remaining-work query contains two pages; all responses stay hermetic.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Page} page - Browser page receiving API mocks.
 * @returns {Promise<string>} Intervention route.
 */
export async function arrangePaginatedWorkItems(page: Page): Promise<string> {
  return arrangeInterventionTables(page, true, async (api) => {
    const intervention = interventionOutput({
      name: 'Work-item pagination regression',
      status: 'in_progress',
      workItemsCount: 32,
      completedWorkItemsCount: 12,
    });
    const member = `/api/organizations/${E2E_ORGANIZATION_ID}/members/${currentOrganizationMemberProfileOutput().id}`;
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkItems(
      intervention.id,
      Array.from({ length: 32 }, (_, index) => ({
        ...interventionWorkItemOutput({
          id: 'paged-' + String(index).padStart(2, '0'),
          '@id': '/api/intervention-work-items/paged-' + String(index).padStart(2, '0'),
          action: 'inspection',
          target: `Task ${String(index).padStart(2, '0')} — Vérification de la signalisation et des équipements de sécurité incendie`,
          status: index >= 20 ? 'completed' : index % 3 === 0 ? 'in_progress' : 'planned',
          source: index === 0 ? 'discovered' : 'planned',
          required: index !== 1,
          assignee: index >= 10 ? member : null,
          estimatedMinutes: index === 0 ? null : index === 1 ? 0 : 240,
          remainingMinutes:
            index === 0 || index === 2 ? null : index === 1 || index >= 20 ? 0 : 180,
          spentMinutes: index < 2 ? 0 : 120,
        }),
        assigneeProfile: {
          displayName: 'Alexandre de La Roche — Responsable des opérations',
          avatarUrl: null,
        },
        evidenceCount: 2,
      })),
    );
  });
}

/**
 * Function expectReadableWorkItemEffort
 *
 * @description
 * Checks single-line desktop titles and separate effort, or fully readable tactile card values.
 * Uses the same bounded fixtures as the paging regressions.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Locator} items - Visible desktop rows or tactile cards.
 * @returns {Promise<void>}
 */
export async function expectReadableWorkItemEffort(items: Locator): Promise<void> {
  await expect(items.first().getByTestId('intervention-work-item-effort')).toHaveText(
    'Not estimated',
  );
  await expect(items.nth(1).getByTestId('intervention-work-item-effort').locator('dd')).toHaveText([
    '0 min',
    '0 min',
  ]);
  await expect(items.nth(2).getByTestId('intervention-work-item-effort').locator('dd')).toHaveText([
    '4 h',
    '2 h',
    'Not estimated',
  ]);
  await expect(items.nth(3).getByTestId('intervention-work-item-effort').locator('dd')).toHaveText([
    '4 h',
    '2 h',
    '3 h',
  ]);
  const title = items.first().getByTestId('intervention-work-item-title');
  await expect(title).toBeVisible();
  await expect(items.first().getByText('Next', { exact: true })).toBeVisible();
  const titleBounds = await title.boundingBox();
  const effortBounds = await items
    .first()
    .getByTestId('intervention-work-item-effort')
    .boundingBox();
  if (!titleBounds || !effortBounds)
    throw new Error('The work-item title and effort must be rendered.');
  if (await items.first().evaluate((element) => element.tagName === 'TR')) {
    await expect(title).toHaveCSS('white-space', 'nowrap');
    await expect(title).toHaveCSS('text-overflow', 'ellipsis');
    expect(effortBounds.x).toBeGreaterThan(titleBounds.x + titleBounds.width);
    expect(Math.abs(titleBounds.y - effortBounds.y)).toBeLessThan(8);
    await expect(items.first().getByTestId('intervention-work-item-effort')).toHaveCSS(
      'text-overflow',
      'ellipsis',
    );
    return;
  }
  expect(titleBounds.y + titleBounds.height).toBeLessThanOrEqual(effortBounds.y);

  const clippedContent = await items.evaluateAll((elements) =>
    elements.flatMap((item) => {
      const bounds = item.getBoundingClientRect();
      return Array.from(
        item.querySelectorAll<HTMLElement>(
          '[data-testid="intervention-work-item-title"], [data-testid="intervention-work-item-effort"], dt, dd',
        ),
      )
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < bounds.left - 1 ||
            rect.right > bounds.right + 1 ||
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1
          );
        })
        .map((element) => element.textContent);
    }),
  );
  expect(clippedContent).toEqual([]);
}
