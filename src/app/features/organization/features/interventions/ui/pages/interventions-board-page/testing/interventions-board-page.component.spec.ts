import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionsBoardPage } from '../interventions-board-page.component';

const allowedActions = (
  overrides: Partial<InterventionAllowedActionsOutput> = {},
): InterventionAllowedActionsOutput => ({
  canEditDetails: false,
  canEditSite: false,
  canEditResponsible: false,
  canEditPlanning: false,
  canMutateWorkItems: false,
  canMutateChanges: false,
  canAssignTeam: false,
  canManageAttachments: false,
  canSubmit: false,
  canWithdraw: false,
  canDelete: false,
  canPublish: false,
  ...overrides,
});

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'a1b2',
    organization: '/api/organizations/1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'in_progress',
    allowedTransitions: ['submitted', 'abandoned'],
    allowedActions: allowedActions(),
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 3,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-02T09:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

const createPage = async (): Promise<ComponentFixture<InterventionsBoardPage>> => {
  const created: ComponentFixture<InterventionsBoardPage> =
    TestBed.createComponent(InterventionsBoardPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

describe('InterventionsBoardPage', () => {
  let fixture: ComponentFixture<InterventionsBoardPage>;
  let load: ReturnType<typeof vi.fn>;
  let transition: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let interventionList: WritableSignal<readonly InterventionOutput[]>;
  let transitioningInterventionIds: WritableSignal<readonly string[]>;

  beforeEach(() => {
    load = vi.fn();
    transition = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    interventionList = signal<readonly InterventionOutput[]>([]);
    transitioningInterventionIds = signal<readonly string[]>([]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: InterventionStore,
          useValue: {
            load,
            transition,
            interventionList,
            transitioningInterventionIds,
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasAnyPermission: (): boolean => true, hasPermission: (): boolean => true },
        },
        { provide: Router, useValue: { navigate, events: EMPTY } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    TestBed.overrideComponent(InterventionsBoardPage, {
      remove: { providers: [InterventionPlanningOptionsStore] },
      add: {
        providers: [
          {
            provide: InterventionPlanningOptionsStore,
            useValue: {
              members: signal([]),
              loadCreationOptions: vi.fn(),
            },
          },
        ],
      },
    });
  });

  it('should load the shared dataset for the workspace on arrival, with no status narrowing', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    const command = load.mock.calls[0][0] as {
      organizationId: string;
      options: { status?: unknown };
    };
    expect(command.organizationId).toBe('org-1');
    expect(command.options.status).toBeUndefined();
  });

  it('should render one column per InterventionStatus, in workflow order', async () => {
    fixture = await createPage();
    const element = fixture.nativeElement as HTMLElement;

    const statuses = [...element.querySelectorAll('[data-testid="intervention-board-column"]')].map(
      (column: Element): string | null => column.getAttribute('data-status'),
    );

    expect(statuses).toEqual([
      'draft',
      'planned',
      'in_progress',
      'changes_requested',
      'submitted',
      'published',
      'abandoned',
    ]);
  });

  it('should place a loaded card in the column matching its own status', async () => {
    interventionList.set([intervention({ id: 'a1', status: 'planned' })]);
    fixture = await createPage();
    const element = fixture.nativeElement as HTMLElement;

    const plannedColumn = element.querySelector(
      '[data-testid="intervention-board-column"][data-status="planned"]',
    );

    expect(plannedColumn?.querySelectorAll('[data-testid="intervention-board-card"]').length).toBe(
      1,
    );
  });

  it('should show the column count matching the number of cards it holds', async () => {
    interventionList.set([
      intervention({ id: 'a1', status: 'planned' }),
      intervention({ id: 'a2', status: 'planned' }),
    ]);
    fixture = await createPage();
    const element = fixture.nativeElement as HTMLElement;

    const plannedColumn = element.querySelector(
      '[data-testid="intervention-board-column"][data-status="planned"]',
    );

    expect(
      plannedColumn
        ?.querySelector('[data-testid="intervention-board-column-count"]')
        ?.textContent?.trim(),
    ).toBe('2');
  });

  it('should dispatch a transition on a legal move and announce it', async () => {
    fixture = await createPage();

    fixture.componentInstance['requestMove'](intervention({ status: 'in_progress' }), 'submitted');

    expect(transition).toHaveBeenCalledWith({ id: 'a1b2', status: 'submitted', revision: 3 });
    expect(fixture.componentInstance['liveMessage']()).toContain('Quarterly extinguisher sweep');
  });

  it('should not dispatch a transition for a server-illegal move', async () => {
    fixture = await createPage();

    fixture.componentInstance['requestMove'](
      intervention({ status: 'draft', allowedTransitions: ['planned'] }),
      'abandoned',
    );

    expect(transition).not.toHaveBeenCalled();
  });

  it('should not dispatch withdraw (submitted → in_progress) when canWithdraw is false', async () => {
    fixture = await createPage();

    fixture.componentInstance['requestMove'](
      intervention({
        status: 'submitted',
        allowedTransitions: ['in_progress', 'changes_requested'],
        allowedActions: allowedActions({ canWithdraw: false }),
      }),
      'in_progress',
    );

    expect(transition).not.toHaveBeenCalled();
  });

  it('should preserve every filter param except status when linking to the list view', async () => {
    fixture = await createPage();
    fixture.componentRef.setInput('priority', 'high');
    fixture.componentRef.setInput('mine', '1');
    await fixture.whenStable();

    const params = fixture.componentInstance['listQueryParams']();

    expect(params).toMatchObject({ priority: 'high', mine: '1' });
    expect(params).not.toHaveProperty('status');
  });
});
