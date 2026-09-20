import type { Page } from '@playwright/test';
import type { InterventionTimeEntry } from '../../../src/app/features/organization/features/interventions/models/intervention-time/intervention-time-entry.interface';
import type { WriteInterventionTimeEntryInput as InterventionTimeWriteInput } from '../../../src/app/features/organization/features/interventions/models/intervention-time/write-intervention-time-entry-input.interface';
import type {
  CapacityWeekInput,
  CapacityExceptionInput,
  WorkloadOutput,
} from '../../../src/app/features/organization/features/workload/models';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { E2E_MEMBER_ID } from '../fixtures/intervention-fixtures';
import { workloadOutput } from '../fixtures/workload-fixtures';

/** Workload-specific routes layered over ApiMock's hermetic authenticated safety net. */
export class WorkloadApiMock {
  public readonly timeWrites: InterventionTimeWriteInput[] = [];
  public entries: InterventionTimeEntry[] = [];
  public readonly projectionQueries: URLSearchParams[] = [];
  public readonly capacityWrites: CapacityWeekInput[] = [];
  public readonly exceptionWrites: CapacityExceptionInput[] = [];
  public constructor(private readonly page: Page) {}

  /**
   * Method projection
   * @method projection
   *
   * @description
   * Mocks date-scoped, server-filtered member pages and online capacity operations.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {number} memberCount - Number of authorized members before pagination.
   * @param {boolean} configured - Whether a saved capacity week exists.
   * @param {((output: WorkloadOutput) => WorkloadOutput) | undefined} decorate - Optional scenario enrichment before filtering.
   * @returns {Promise<void>} Resolves once all workload routes are installed.
   */
  public async projection(
    memberCount = 1,
    configured = true,
    decorate?: (output: WorkloadOutput) => WorkloadOutput,
  ): Promise<void> {
    await this.page.route(
      '**/api/organizations/' + E2E_ORGANIZATION_ID + '/workload?*',
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        const query = new URL(route.request().url()).searchParams;
        this.projectionQueries.push(query);
        const base = workloadOutput(query.get('from') ?? '2026-09-14', memberCount);
        const result = decorate ? decorate(base) : base;
        const members = result.projection.members.filter(
          (member) =>
            (!query.has('member') || member.memberId === query.get('member')) &&
            (!query.has('team') ||
              [E2E_MEMBER_ID, 'workload-member-02'].includes(member.memberId)) &&
            (query.get('overloaded') !== 'true' ||
              member.days.some((day) => (day.overloadMinutes ?? 0) > 0)),
        );
        const pageSize = Number(query.get('pageSize') ?? 10);
        const page = Math.min(
          Number(query.get('page') ?? 1),
          Math.max(1, Math.ceil(members.length / pageSize)),
        );
        await route.fulfill({
          json: {
            ...result,
            totalItems: members.length,
            page,
            pageSize,
            projection: {
              ...result.projection,
              members: members.slice((page - 1) * pageSize, page * pageSize),
            },
          },
        });
      },
    );
    await this.page.route(
      new RegExp(
        '/api/organizations/' +
          E2E_ORGANIZATION_ID +
          '/workload/(settings|members/[^/]+/capacity)$',
      ),
      async (route) => {
        if (route.request().method() === 'POST') {
          this.capacityWrites.push(route.request().postDataJSON() as CapacityWeekInput);
          return route.fulfill({ status: 201, json: { '@type': 'Capacity', id: 'week-1' } });
        }
        if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          json: {
            '@type': 'Capacity',
            '@id': route.request().url(),
            organizationId: E2E_ORGANIZATION_ID,
            configuration: {
              weeks: configured
                ? [
                    {
                      id: 'week-existing',
                      scopeId: E2E_ORGANIZATION_ID,
                      effectiveOn: '2026-09-01',
                      minutes: [420, 420, 420, 420, 420, 0, 0],
                    },
                  ]
                : [],
              exceptions: [],
            },
          },
        });
      },
    );
    await this.page.route(
      new RegExp(
        '/api/organizations/' + E2E_ORGANIZATION_ID + '/workload/members/[^/]+/exceptions$',
      ),
      async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        this.exceptionWrites.push(route.request().postDataJSON() as CapacityExceptionInput);
        await route.fulfill({ status: 201, json: { '@type': 'Capacity', id: 'exception-1' } });
      },
    );
  }

  public async timeJournal(taskId: string): Promise<void> {
    await this.page.route(
      '**/api/intervention-work-items/' + taskId + '/time-entries',
      async (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            json: {
              '@id': route.request().url(),
              '@type': 'InterventionTimeJournal',
              workItemId: taskId,
              entries: this.entries,
            },
          });
        }
        const input = route.request().postDataJSON() as InterventionTimeWriteInput;
        this.timeWrites.push(input);
        const existing = this.entries.find((entry) => entry.id === input.id);
        const entry: InterventionTimeEntry = existing ?? {
          ...input,
          workItemId: taskId,
          revision: 1,
          cancelled: false,
          createdBy: E2E_MEMBER_ID,
          updatedBy: E2E_MEMBER_ID,
          createdAt: '2026-09-16T10:00:00Z',
          updatedAt: '2026-09-16T10:00:00Z',
          versions: [
            {
              revision: 1,
              workedOn: input.workedOn,
              minutes: input.minutes,
              note: input.note,
              cancelled: false,
              actorId: E2E_MEMBER_ID,
              recordedAt: '2026-09-16T10:00:00Z',
            },
          ],
        };
        if (!existing) this.entries.push(entry);
        await route.fulfill({
          status: 201,
          json: {
            '@type': 'TimeEntry',
            '@id': route.request().url() + '/' + entry.id,
            id: entry.id,
            entry,
          },
        });
      },
    );
  }
}
