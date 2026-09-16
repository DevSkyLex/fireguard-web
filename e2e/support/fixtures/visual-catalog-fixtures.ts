import type { CalendarFeedItemOutput } from '../../../src/app/features/organization/features/calendar/models/calendar-feed/calendar-feed-item-output.interface';
import type { ChecklistOutput } from '../../../src/app/features/organization/features/checklists/models/checklist/checklist-output.interface';
import type { TeamOutput } from '../../../src/app/features/organization/models/team/team-output.interface';
import { E2E_ORGANIZATION_ID } from './api-fixtures';

/**
 * Function visualCatalogFixtures
 * @description Populates three read-only catalogs with source-contract fixtures and a local-noon
 * calendar date. No create/edit endpoints or backend records are introduced.
 * @access public
 * @since 1.0.0
 * @returns {{ teams: TeamOutput[]; checklists: ChecklistOutput[]; calendar: CalendarFeedItemOutput[] }} Bounded visual catalog data.
 */
export function visualCatalogFixtures(): {
  teams: TeamOutput[];
  checklists: ChecklistOutput[];
  calendar: CalendarFeedItemOutput[];
} {
  const now = new Date();
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();
  return {
    teams: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/teams/e2e-visual-team`,
        '@type': 'Team',
        id: 'e2e-visual-team',
        organizationId: E2E_ORGANIZATION_ID,
        name: 'North wing fire safety and maintenance',
        description: 'Inspection coordination across the depot and adjoining technical rooms.',
        memberCount: 12,
        createdAt: noon,
        updatedAt: noon,
      },
    ],
    checklists: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/checklists/e2e-visual-checklist`,
        '@type': 'Checklist',
        id: 'e2e-visual-checklist',
        organizationId: E2E_ORGANIZATION_ID,
        name: 'Monthly extinguisher and evacuation-route inspection',
        version: '2',
        status: 'active',
        items: [
          {
            id: 'e2e-visual-item-1',
            label: 'Verify access and signage',
            description: null,
            required: true,
            position: 1,
          },
          {
            id: 'e2e-visual-item-2',
            label: 'Record pressure and inspection label',
            description: null,
            required: true,
            position: 2,
          },
        ],
        createdAt: noon,
        updatedAt: noon,
      },
    ],
    calendar: [
      {
        sourceKey: 'calendar_event',
        id: 'e2e-visual-calendar',
        title: 'North wing evacuation exercise and equipment inspection',
        description: 'Coordinate access with the maintenance team.',
        startsAt: noon,
        endsAt: new Date(Date.parse(noon) + 3_600_000).toISOString(),
        allDay: false,
        targetType: 'calendar_event',
        targetId: 'e2e-visual-calendar',
      },
    ],
  };
}
