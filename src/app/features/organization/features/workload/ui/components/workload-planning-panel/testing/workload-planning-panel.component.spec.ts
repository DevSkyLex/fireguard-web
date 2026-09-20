import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  UnallocatedWorkOutput,
  WorkloadProjectionOutput,
} from '@features/organization/features/workload/models';
import type { MemberSelectOption } from '@features/organization/models';
import { WorkloadPlanningPanel } from '../workload-planning-panel.component';

describe('WorkloadPlanningPanel', () => {
  let fixture: ComponentFixture<WorkloadPlanningPanel>;
  let root: HTMLElement;
  const identity: MemberSelectOption = {
    value: 'member-1',
    label: 'Sofia Moreau',
    displayName: 'Sofia Moreau',
    avatarUrl: null,
    initials: 'SM',
    roleLabel: 'Planner',
  };
  const task: UnallocatedWorkOutput = {
    taskId: 'task-1',
    interventionId: 'intervention-1',
    label: 'Paris inventory',
    reason: 'unestimated',
    remainingMinutes: null,
    commitment: 'committed',
  };
  const member = {
    memberId: identity.value,
    displayName: identity.displayName,
    days: [],
    unallocated: [task],
  };
  const projection: WorkloadProjectionOutput = {
    startsOn: '2026-09-14',
    endsOn: '2026-09-20',
    today: '2026-09-16',
    timezone: 'Europe/Paris',
    firstDayOfWeek: 'monday',
    calculatedAt: '2026-09-16T10:00:00Z',
    completeness: 'partial',
    members: [member],
    unassigned: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(WorkloadPlanningPanel);
    fixture.componentRef.setInput('organizationId', 'organization-1');
    fixture.componentRef.setInput('projection', projection);
    fixture.componentRef.setInput('members', [identity]);
    root = fixture.nativeElement;
  });

  it('renders nothing when there is no excluded or unassigned work', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...member, unallocated: [] }],
    });
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
  });

  it('keeps all six server reasons findable but does not mount their task lists before opening', async () => {
    const reasons: UnallocatedWorkOutput['reason'][] = [
      'unestimated',
      'undated',
      'overdue',
      'unknown_capacity',
      'no_available_day',
    ];
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [
        {
          ...member,
          unallocated: reasons.map((reason) => Object.assign({}, task, { taskId: reason, reason })),
        },
      ],
      unassigned: [{ ...task, taskId: 'unassigned', reason: 'unassigned' }],
    });
    await fixture.whenStable();
    const triggers = root.querySelectorAll('[hlmCollapsibleTrigger]');
    expect(triggers.length).toBe(6);
    expect(
      [...triggers].every((trigger) => trigger.getAttribute('aria-expanded') === 'false'),
    ).toBe(true);
    expect(root.querySelectorAll('li').length).toBe(0);
    expect(root.textContent).toContain('Members on this page');
    expect(root.textContent).not.toContain('0 min');
  });

  it('counts distinct tasks and consolidates intervention links while retaining member identity', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...member, unallocated: [task, { ...task, taskId: 'task-2' }, task] }],
    });
    await fixture.whenStable();
    const trigger = root.querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]');
    expect(trigger?.textContent).toContain('2 tasks');
    trigger?.click();
    await fixture.whenStable();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelectorAll('li').length).toBe(1);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/organizations/organization-1/interventions/intervention-1',
    );
    expect(root.querySelector('li')?.textContent).toContain('2 tasks');
    expect(root.querySelector('li')?.textContent).toContain('Sofia Moreau');
    expect(root.querySelector('li')?.textContent).toContain('Planner');
    expect(root.querySelector('[hlmAvatarFallback]')?.textContent?.trim()).toBe('SM');
    expect(root.querySelector('li')?.textContent).not.toContain('remaining');
    expect(root.querySelector('li')?.textContent).not.toContain('—');
  });

  it('never combines different assignees or draft and committed tasks', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [
        { ...member, unallocated: [task, { ...task, taskId: 'draft', commitment: 'draft' }] },
        {
          ...member,
          memberId: 'member-2',
          displayName: 'Julien Mercier',
          unallocated: [{ ...task, taskId: 'task-2' }],
        },
      ],
    });
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]')?.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('li').length).toBe(3);
    expect(root.querySelectorAll('li [hlmBadge]').length).toBe(1);
    expect(root.querySelector('li [hlmBadge]')?.textContent?.trim()).toBe('Draft');
    expect(root.textContent).toContain('Julien Mercier');
  });

  it('sums known effort, preserves zero and never presents a partial sum as a complete estimate', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [],
      unassigned: [
        { ...task, taskId: 'a', reason: 'unassigned', remainingMinutes: 60 },
        { ...task, taskId: 'b', reason: 'unassigned', remainingMinutes: 30 },
        { ...task, taskId: 'c', interventionId: 'zero', reason: 'unassigned', remainingMinutes: 0 },
        {
          ...task,
          taskId: 'd',
          interventionId: 'partial',
          reason: 'unassigned',
          remainingMinutes: 120,
        },
        { ...task, taskId: 'e', interventionId: 'partial', reason: 'unassigned' },
      ],
    });
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]')?.click();
    await fixture.whenStable();
    const rows = root.querySelectorAll('li');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('1 h 30 min remaining');
    expect(rows[1].textContent).toContain('0 min remaining');
    expect(rows[2].textContent).not.toContain('remaining');
    expect(rows[2].textContent).toContain('2 tasks');
    expect(root.querySelector('hlm-avatar')).toBeNull();
  });

  it('opens one reason at a time and resets disclosure for a new projection', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...member, unallocated: [task, { ...task, taskId: 'late', reason: 'overdue' }] }],
    });
    await fixture.whenStable();
    const triggers = root.querySelectorAll<HTMLButtonElement>('[hlmCollapsibleTrigger]');
    triggers[0].click();
    await fixture.whenStable();
    triggers[1].click();
    await fixture.whenStable();
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelectorAll('li').length).toBe(1);
    fixture.componentRef.setInput('projection', { ...projection });
    await fixture.whenStable();
    expect(root.querySelector('[hlmCollapsibleTrigger]')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(root.querySelectorAll('li').length).toBe(0);
  });

  it('emits the affected member only when capacity administration is authorized', async () => {
    const requested = vi.fn();
    fixture.componentInstance.capacityRequested.subscribe(requested);
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...member, unallocated: [{ ...task, reason: 'unknown_capacity' }] }],
    });
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]')?.click();
    await fixture.whenStable();
    expect(root.querySelector('li button')).toBeNull();
    fixture.componentRef.setInput('canManageCapacity', true);
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('li button')?.click();
    expect(requested).toHaveBeenCalledExactlyOnceWith(identity.value);
    fixture.componentRef.setInput('canManageCapacity', false);
    await fixture.whenStable();
    expect(root.querySelector('li button')).toBeNull();
  });

  it('keeps intervention context inside its link and capacity actions outside navigation', async () => {
    fixture.componentRef.setInput('canManageCapacity', true);
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...member, unallocated: [{ ...task, reason: 'unknown_capacity' }] }],
    });
    await fixture.whenStable();
    const trigger = root.querySelector<HTMLButtonElement>('[hlmCollapsibleTrigger]');
    expect(trigger?.querySelector('[hlmBadge]')?.textContent?.trim()).toBe('1 task');
    trigger?.click();
    await fixture.whenStable();
    const link = root.querySelector('li a');
    expect(link?.textContent).toContain('Paris inventory');
    expect(link?.textContent).toContain('Sofia Moreau');
    expect(link?.textContent).toContain('Planner');
    expect(link?.querySelector('button')).toBeNull();
    expect(root.querySelector('li button')?.textContent).toContain('Configure capacity');
    expect(
      [...root.querySelectorAll('ng-icon')].every(
        (icon) => icon.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true);
  });
});
