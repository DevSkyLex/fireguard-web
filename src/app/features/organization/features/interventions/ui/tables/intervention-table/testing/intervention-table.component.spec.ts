import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
  InterventionSortField,
} from '@features/organization/features/interventions/models';
import type { InterventionListItemViewModel } from '../../../pages/interventions-page/models';
import { InterventionTable } from '../intervention-table.component';
import type { InterventionTableColumn, InterventionTransitionRequest } from '../models';

const serverActions = (
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
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: '2026-09-01T09:00:00+00:00',
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

const row = (
  overrides: Partial<InterventionListItemViewModel> = {},
): InterventionListItemViewModel => ({
  intervention: intervention(),
  isOverdue: false,
  isDueSoon: false,
  siteName: 'Warehouse B',
  people: [],
  ...overrides,
});

describe('InterventionTable', () => {
  let fixture: ComponentFixture<InterventionTable>;
  let element: HTMLElement;

  const openRowMenu = async (): Promise<void> => {
    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-menu"]')
      ?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionTable);
    fixture.componentRef.setInput('items', [row()]);
    fixture.componentRef.setInput('sortOrder', { field: 'dueAt', direction: 'asc' });
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'interventions']);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should link the name to the intervention, with a real href', () => {
    const anchor: HTMLAnchorElement | null = element.querySelector(
      '[data-testid="intervention-table-row"] a',
    );

    const rowEl: Element | null = element.querySelector('[data-testid="intervention-table-row"]');

    expect(anchor?.getAttribute('href')).toBe('/organizations/org-1/interventions/a1b2');
    expect(anchor?.textContent?.trim()).toBe('Quarterly extinguisher sweep');
    expect(rowEl?.getAttribute('role')).toBeNull();
    expect(rowEl?.getAttribute('tabindex')).toBeNull();
  });

  it('should render the status, the priority and the type through the tag registry', () => {
    // Scoped to the table: the card layout renders the same row a second time,
    // which is the point of the shared surface, not a duplicate to assert on.
    expect(
      element.querySelectorAll('[data-testid="intervention-table"] app-intervention-tag').length,
    ).toBe(3);
    expect(element.textContent).toContain('Planned');
    expect(element.textContent).toContain('High');
    expect(element.textContent).toContain('Inventory');
  });

  it('should announce the active ordering on the sorted head only', () => {
    const sorted: readonly string[] = [...element.querySelectorAll('th')].map(
      (head: Element): string => head.getAttribute('aria-sort') ?? 'absent',
    );

    expect(sorted.filter((value: string): boolean => value === 'ascending').length).toBe(1);
    expect(sorted.filter((value: string): boolean => value === 'none').length).toBe(1);
  });

  it('should emit the field when a sortable head is activated', () => {
    const emitted: InterventionSortField[] = [];
    fixture.componentInstance.sortChanged.subscribe((field: InterventionSortField): void => {
      emitted.push(field);
    });

    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-table-sort-due"]')
      ?.click();
    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-table-sort-priority"]')
      ?.click();

    expect(emitted).toEqual(['dueAt', 'priority']);
  });

  it('should drop a hidden column from the head and the body alike', async () => {
    const before: number = element.querySelectorAll('thead th').length;

    fixture.componentRef.setInput(
      'hiddenColumns',
      new Set<InterventionTableColumn>(['site', 'type']),
    );
    await fixture.whenStable();

    expect(element.querySelectorAll('thead th').length).toBe(before - 2);
    expect(element.textContent).not.toContain('Warehouse B');
    expect(
      element.querySelectorAll('[data-testid="intervention-table"] app-intervention-tag').length,
    ).toBe(2);
  });

  it('should mark an overdue deadline with an icon, never with red text', async () => {
    fixture.componentRef.setInput('items', [row({ isOverdue: true })]);
    await fixture.whenStable();

    const cells: readonly Element[] = [...element.querySelectorAll('tbody td')];
    const due: Element | undefined = cells.at(-2);
    const icon: Element | null | undefined = due?.querySelector('ng-icon');

    expect(due?.className).not.toContain('text-destructive');
    expect(icon).toBeTruthy();
    expect(icon?.className).toContain('text-destructive');
  });

  it('should carry no overdue icon when the deadline is not overdue', async () => {
    fixture.componentRef.setInput('items', [row({ isOverdue: false })]);
    await fixture.whenStable();

    const cells: readonly Element[] = [...element.querySelectorAll('tbody td')];
    const due: Element | undefined = cells.at(-2);

    expect(due?.querySelector('ng-icon')).toBeNull();
  });

  it('should offer only Open and Copy when the member cannot transition', async () => {
    fixture.componentRef.setInput('items', [
      row({ intervention: intervention({ allowedTransitions: ['in_progress'] }) }),
    ]);
    await fixture.whenStable();
    await openRowMenu();

    expect(
      document.querySelectorAll('[data-testid="intervention-table-row-transition"]').length,
    ).toBe(0);
    expect(document.body.textContent).toContain('Copy reference');
  });

  it('should offer the intervention’s own allowed transitions, and nothing else', async () => {
    fixture.componentRef.setInput('canTransition', true);
    fixture.componentRef.setInput('items', [
      row({ intervention: intervention({ allowedTransitions: ['in_progress', 'abandoned'] }) }),
    ]);
    await fixture.whenStable();
    await openRowMenu();

    const targets: readonly string[] = [
      ...document.querySelectorAll('[data-testid="intervention-table-row-transition"]'),
    ].map((b: Element): string => b.textContent?.trim() ?? '');

    expect(targets).toEqual(['In progress', 'Abandoned']);
  });

  it('should withhold the transition entries of a row whose transition is in flight', async () => {
    fixture.componentRef.setInput('canTransition', true);
    fixture.componentRef.setInput('transitioningIds', ['i-9']);
    fixture.componentRef.setInput('items', [
      row({
        intervention: intervention({ id: 'i-9', allowedTransitions: ['in_progress', 'abandoned'] }),
      }),
    ]);
    await fixture.whenStable();
    await openRowMenu();

    expect(
      document.querySelectorAll('[data-testid="intervention-table-row-transition"]').length,
    ).toBe(0);
    expect(document.body.textContent).toContain('Copy reference');
  });

  it('should emit the transition with the row it was opened on', async () => {
    const emitted: InterventionTransitionRequest[] = [];
    fixture.componentInstance.transitionRequested.subscribe(
      (request: InterventionTransitionRequest): void => {
        emitted.push(request);
      },
    );

    fixture.componentRef.setInput('canTransition', true);
    fixture.componentRef.setInput('items', [
      row({ intervention: intervention({ id: 'i-9', allowedTransitions: ['in_progress'] }) }),
    ]);
    await fixture.whenStable();
    await openRowMenu();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-transition"]')
      ?.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0]?.intervention.id).toBe('i-9');
    expect(emitted[0]?.status).toBe('in_progress');
  });

  it('should say so plainly when a page holds no rows', async () => {
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="intervention-table-row"]')).toBeNull();
    expect(element.textContent).toContain('No results.');
  });

  it('should carry an accessible caption', () => {
    const caption: HTMLElement | null = element.querySelector('caption');

    expect(caption?.className).toContain('sr-only');
    expect(caption?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should name the scrolling region from the table caption', () => {
    const region: HTMLElement | null = element.querySelector('[role="region"]');
    const caption: HTMLElement | null = element.querySelector('caption');

    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect(caption?.id).toBeTruthy();
  });

  it('should draw placeholder rows on a first load, and no data rows', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="intervention-table-row"]')).toBeNull();
    expect(element.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should keep the rows on screen while a later page loads', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    // The shared surface's loading contract is "first load only": flashing the
    // table to skeletons on page 2 loses the operator's place for nothing.
    expect(element.querySelector('[data-testid="intervention-table-row"]')).not.toBeNull();
    expect(element.querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  describe('selection', () => {
    it('should render an unchecked row checkbox by default', () => {
      const checkbox: Element | null = element.querySelector(
        '[data-testid="intervention-table-row-select"]',
      );

      expect(checkbox?.querySelector('ng-icon')).toBeNull();
    });

    it('should show a checked row checkbox for a selected id', async () => {
      fixture.componentRef.setInput('selectedIds', new Set(['a1b2']));
      await fixture.whenStable();

      const checkbox: Element | null = element.querySelector(
        '[data-testid="intervention-table-row-select"]',
      );

      expect(checkbox?.querySelector('ng-icon')).toBeTruthy();
    });

    it('should emit the full next selection when a row checkbox is clicked', async () => {
      const emitted: ReadonlySet<string>[] = [];
      fixture.componentInstance.selectionChanged.subscribe((ids: ReadonlySet<string>): void => {
        emitted.push(ids);
      });

      element
        .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-select"] button')
        ?.click();
      await fixture.whenStable();

      expect(emitted.length).toBe(1);
      expect([...(emitted[0] ?? [])]).toEqual(['a1b2']);
    });

    it('should mark the header checkbox checked once every rendered row is selected', async () => {
      fixture.componentRef.setInput('selectedIds', new Set(['a1b2']));
      await fixture.whenStable();

      const headerCheckbox: Element | null = element.querySelector(
        '[data-testid="intervention-table-select-all"]',
      );

      expect(headerCheckbox?.querySelector('ng-icon')).toBeTruthy();
    });

    it('should select every rendered row when the header checkbox is toggled on', async () => {
      const emitted: ReadonlySet<string>[] = [];
      fixture.componentInstance.selectionChanged.subscribe((ids: ReadonlySet<string>): void => {
        emitted.push(ids);
      });

      element
        .querySelector<HTMLButtonElement>('[data-testid="intervention-table-select-all"] button')
        ?.click();
      await fixture.whenStable();

      expect([...(emitted[0] ?? [])]).toEqual(['a1b2']);
    });
  });

  describe('delete', () => {
    it('should not offer Delete when the server does not advertise it', async () => {
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ status: 'draft' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(document.querySelector('[data-testid="intervention-table-row-delete"]')).toBeNull();
    });

    it('should follow the server-advertised canDelete flag, not a client status window', async () => {
      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            status: 'planned',
            allowedActions: serverActions({ canDelete: true }),
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(
        document.querySelector('[data-testid="intervention-table-row-delete"]'),
      ).not.toBeNull();
    });

    it('should emit the row it was opened on when Delete is clicked', async () => {
      const emitted: InterventionOutput[] = [];
      fixture.componentInstance.deleteRequested.subscribe((deleted: InterventionOutput): void => {
        emitted.push(deleted);
      });

      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            id: 'i-del',
            status: 'draft',
            allowedActions: serverActions({ canDelete: true }),
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      document
        .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-delete"]')
        ?.click();

      expect(emitted.length).toBe(1);
      expect(emitted[0]?.id).toBe('i-del');
    });
  });

  describe('assign', () => {
    it('should not offer Assign responsible without the permission', async () => {
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ status: 'draft' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(document.querySelector('[data-testid="intervention-table-row-assign"]')).toBeNull();
    });

    it('should not offer Assign responsible for a status planning may not touch', async () => {
      fixture.componentRef.setInput('canAssign', true);
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ status: 'in_progress' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(document.querySelector('[data-testid="intervention-table-row-assign"]')).toBeNull();
    });

    it.each<'draft' | 'planned'>(['draft', 'planned'])(
      'should offer Assign responsible for a %s intervention when permitted',
      async (status: 'draft' | 'planned'): Promise<void> => {
        fixture.componentRef.setInput('canAssign', true);
        fixture.componentRef.setInput('items', [row({ intervention: intervention({ status }) })]);
        await fixture.whenStable();
        await openRowMenu();

        expect(
          document.querySelector('[data-testid="intervention-table-row-assign"]'),
        ).not.toBeNull();
      },
    );

    it('should emit the row it was opened on when Assign responsible is clicked', async () => {
      const emitted: InterventionOutput[] = [];
      fixture.componentInstance.assignRequested.subscribe((requested: InterventionOutput): void => {
        emitted.push(requested);
      });

      fixture.componentRef.setInput('canAssign', true);
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ id: 'i-assign', status: 'draft' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      document
        .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-assign"]')
        ?.click();

      expect(emitted.length).toBe(1);
      expect(emitted[0]?.id).toBe('i-assign');
    });
  });

  describe('duplicate', () => {
    it('should not offer Duplicate without the permission', async () => {
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ status: 'abandoned' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(document.querySelector('[data-testid="intervention-table-row-duplicate"]')).toBeNull();
    });

    it('should offer Duplicate for an abandoned intervention when permitted', async () => {
      fixture.componentRef.setInput('canDuplicate', true);
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ status: 'abandoned' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      expect(
        document.querySelector('[data-testid="intervention-table-row-duplicate"]'),
      ).not.toBeNull();
    });

    it('should emit the row it was opened on when Duplicate is clicked', async () => {
      const emitted: InterventionOutput[] = [];
      fixture.componentInstance.duplicateRequested.subscribe(
        (requested: InterventionOutput): void => {
          emitted.push(requested);
        },
      );

      fixture.componentRef.setInput('canDuplicate', true);
      fixture.componentRef.setInput('items', [
        row({ intervention: intervention({ id: 'i-dup' }) }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      document
        .querySelector<HTMLButtonElement>('[data-testid="intervention-table-row-duplicate"]')
        ?.click();

      expect(emitted.length).toBe(1);
      expect(emitted[0]?.id).toBe('i-dup');
    });
  });

  describe('identity-gated transitions', () => {
    it('should disable the submitted target for anyone but the responsible', async () => {
      fixture.componentRef.setInput('canTransition', true);
      fixture.componentRef.setInput('currentMemberIri', '/api/organizations/1/members/other');
      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            status: 'in_progress',
            allowedTransitions: ['submitted'],
            responsible: '/api/organizations/1/members/me',
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      const target: HTMLButtonElement | null = document.querySelector(
        '[data-testid="intervention-table-row-transition"]',
      );

      expect(target?.disabled).toBe(true);

      // The reason is linked by `[appGateReason]` and rendered visibly beside
      // the label — it used to be sr-only, readable only through a native
      // `title` that touch never shows.
      const reasonId: string | null = target?.getAttribute('aria-describedby') ?? null;
      expect(reasonId).not.toBeNull();

      const reason: HTMLElement | null = document.getElementById(reasonId as string);
      expect(reason?.textContent).toContain('Only the responsible can do this.');
      expect(reason?.classList.contains('sr-only')).toBe(false);
      expect(target?.getAttribute('title')).toBeNull();

      const emitted: InterventionTransitionRequest[] = [];
      fixture.componentInstance.transitionRequested.subscribe(
        (request: InterventionTransitionRequest): void => {
          emitted.push(request);
        },
      );
      target?.click();
      expect(emitted.length).toBe(0);
    });

    it('should enable the submitted target for the responsible', async () => {
      fixture.componentRef.setInput('canTransition', true);
      fixture.componentRef.setInput('currentMemberIri', '/api/organizations/1/members/me');
      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            status: 'in_progress',
            allowedTransitions: ['submitted'],
            responsible: '/api/organizations/1/members/me',
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      const target: HTMLButtonElement | null = document.querySelector(
        '[data-testid="intervention-table-row-transition"]',
      );

      expect(target?.disabled).toBe(false);
    });

    it('should disable withdrawal (in_progress) on a submitted row for anyone but the responsible', async () => {
      fixture.componentRef.setInput('canTransition', true);
      fixture.componentRef.setInput('currentMemberIri', '/api/organizations/1/members/other');
      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            status: 'submitted',
            allowedTransitions: ['in_progress'],
            responsible: '/api/organizations/1/members/me',
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      const target: HTMLButtonElement | null = document.querySelector(
        '[data-testid="intervention-table-row-transition"]',
      );

      expect(target?.disabled).toBe(true);
    });

    it('should leave a target unrelated to submission ungated', async () => {
      fixture.componentRef.setInput('canTransition', true);
      fixture.componentRef.setInput('currentMemberIri', '/api/organizations/1/members/other');
      fixture.componentRef.setInput('items', [
        row({
          intervention: intervention({
            status: 'planned',
            allowedTransitions: ['abandoned'],
            responsible: '/api/organizations/1/members/me',
          }),
        }),
      ]);
      await fixture.whenStable();
      await openRowMenu();

      const target: HTMLButtonElement | null = document.querySelector(
        '[data-testid="intervention-table-row-transition"]',
      );

      expect(target?.disabled).toBe(false);
    });
  });
});
