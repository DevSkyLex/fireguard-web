import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import type {
  WorkloadDayOutput,
  WorkloadDaySelection,
} from '@features/organization/features/workload/models';
import { WorkloadDaySheet } from '../workload-day-sheet.component';

const sheet = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>('hlm-sheet-content');
  if (!element) throw new Error('Day sheet is not open');
  return element;
};
const rows = (): HTMLElement[] =>
  Array.from(sheet().querySelectorAll<HTMLElement>('[data-testid="workload-day-intervention"]'));
const text = (element: Element | null): string => {
  if (!element) throw new Error('Expected rendered element');
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};
describe('WorkloadDaySheet', () => {
  let fixture: ComponentFixture<WorkloadDaySheet>;
  let selection: WorkloadDaySelection;

  const changeDay = async (day: Partial<WorkloadDayOutput>): Promise<void> => {
    fixture.componentRef.setInput('selection', { ...selection, day: { ...selection.day, ...day } });
    await fixture.whenStable();
  };
  const expand = async (): Promise<void> => {
    sheet().querySelector<HTMLButtonElement>('#workload-day-excluded-trigger')?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    TestBed.configureTestingModule({
      providers: [provideInteractionCapabilities(), provideRouter([])],
    });
    const day: WorkloadDayOutput = {
      date: '2026-09-16',
      capacityMinutes: 420,
      actualMinutes: 120,
      remainingMinutes: 360,
      draftMinutes: 0,
      overloadMinutes: 60,
      utilizationPercent: 114,
      completeness: 'partial',
      availability: 'overloaded',
      contributions: [
        {
          taskId: 'a',
          interventionId: 'visit',
          label: 'Site inventory',
          kind: 'actual',
          minutes: 30,
          entryId: 'first',
        },
        {
          taskId: 'a',
          interventionId: 'visit',
          label: 'Site inventory',
          kind: 'actual',
          minutes: 90,
          entryId: 'second',
        },
        {
          taskId: 'a',
          interventionId: 'visit',
          label: 'Site inventory',
          kind: 'committed',
          minutes: 300,
        },
        {
          taskId: 'b',
          interventionId: 'visit',
          label: 'Site inventory',
          kind: 'committed',
          minutes: 60,
        },
      ],
    };
    selection = {
      day,
      member: {
        memberId: 'member',
        displayName: 'Marie Lefèvre',
        days: [day],
        unallocated: [
          {
            taskId: 'unknown',
            interventionId: 'other',
            label: 'Estimate missing',
            reason: 'unestimated',
            remainingMinutes: null,
            commitment: 'committed',
          },
        ],
      },
    };
    fixture = TestBed.createComponent(WorkloadDaySheet);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('selection', selection);
    fixture.componentRef.setInput('identity', {
      value: 'member',
      label: 'Marie Lefèvre',
      displayName: 'Marie Lefèvre',
      avatarUrl: null,
      initials: 'ML',
      roleLabel: 'Planner',
    });
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('groups ledger entries and remaining tasks by intervention without reallocating their minutes', () => {
    expect(rows()).toHaveLength(1);
    expect(text(rows()[0].querySelector('a'))).toBe('Site inventory');
    expect(text(rows()[0].querySelector('[data-testid="workload-day-intervention-total"]'))).toBe(
      '8 h',
    );
    expect(text(rows()[0].querySelector('dl'))).toBe(
      'Time recorded 2 h Remaining committed work 6 h',
    );
    expect(rows()[0].querySelector('a')?.getAttribute('href')).toBe(
      '/organizations/org/interventions/visit',
    );
    expect(sheet().querySelectorAll('a')).toHaveLength(1);
    expect(text(sheet())).toContain('Marie Lefèvre');
    expect(text(sheet())).toContain('Planner');
    expect(text(sheet())).toContain('Wednesday, September 16, 2026');
    expect(text(sheet())).toContain('Over capacity by 1 h');
    const overloadResult = sheet().querySelector('output');
    expect(overloadResult?.textContent).toContain('Over capacity by 1 h');
    expect(overloadResult?.textContent).toContain('Review the remaining work or availability');
    expect(overloadResult?.parentElement?.getAttribute('role')).toBe('presentation');
    expect(sheet().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
      '100',
    );
    expect(selection.day.contributions).toHaveLength(4);
  });

  it('keeps drafts out of committed totals, including a draft-only intervention', async () => {
    await changeDay({
      draftMinutes: 120,
      contributions: [
        ...selection.day.contributions,
        {
          taskId: 'draft-a',
          interventionId: 'visit',
          label: 'Site inventory',
          kind: 'draft',
          minutes: 30,
        },
        {
          taskId: 'draft-b',
          interventionId: 'draft-visit',
          label: 'Future inventory',
          kind: 'draft',
          minutes: 90,
        },
      ],
    });
    expect(rows()).toHaveLength(2);
    expect(sheet().querySelector('[data-testid="workload-day-total"]')?.textContent?.trim()).toBe(
      '8 h',
    );
    expect(text(rows()[0])).toContain('Draft (not included) 30 min');
    expect(
      rows()[0]
        .querySelector('[data-testid="workload-day-intervention-total"]')
        ?.textContent?.trim(),
    ).toBe('8 h');
    expect(text(rows()[1].querySelector('a'))).toBe('Future inventory');
    expect(text(rows()[1].querySelector('dl'))).toBe('Draft (not included) 1 h 30 min');
    expect(rows()[1].querySelector('[data-testid="workload-day-intervention-total"]')).toBeNull();
  });

  it('retains the incomplete warning while hiding the member-wide excluded list until requested', async () => {
    expect(text(sheet())).toContain('Incomplete workload');
    expect(text(sheet())).toContain('These totals do not confirm availability.');
    expect(text(sheet())).not.toContain('Estimate missing');
    expect(
      sheet().querySelector('#workload-day-excluded-trigger')?.getAttribute('aria-expanded'),
    ).toBe('false');
    await expand();
    const excludedRegion = sheet().querySelector('section[hlmCollapsibleContent]');
    expect(excludedRegion?.getAttribute('role')).toBeNull();
    expect(excludedRegion?.getAttribute('aria-labelledby')).toBe('workload-day-excluded-trigger');
    expect(text(sheet())).toContain("Across this member's work, not only this day.");
    expect(text(sheet())).toContain('Estimate missing');
    expect(text(sheet())).toContain('Remaining work not estimated');
    expect(text(sheet())).not.toContain('Remaining work not estimated ·');
    expect(
      sheet().querySelector('#workload-day-excluded-trigger')?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('resets disclosure when switching days and after closing and reopening', async () => {
    await expand();
    await changeDay({ date: '2026-09-17' });
    expect(text(sheet())).not.toContain('Estimate missing');
    await expand();
    fixture.componentRef.setInput('selection', null);
    await fixture.whenStable();
    fixture.componentRef.setInput('selection', selection);
    await fixture.whenStable();
    expect(text(sheet())).not.toContain('Estimate missing');
  });

  for (const capacityMinutes of [null, 0]) {
    it(`keeps recorded time visible without a utilization bar for ${capacityMinutes === null ? 'unknown' : 'zero'} capacity`, async () => {
      await changeDay({
        capacityMinutes,
        overloadMinutes: capacityMinutes === 0 ? 480 : null,
        utilizationPercent: null,
      });
      expect(sheet().querySelector('[role="progressbar"]')).toBeNull();
      expect(sheet().querySelector('[data-testid="workload-day-total"]')?.textContent?.trim()).toBe(
        '8 h',
      );
      expect(text(sheet())).toContain(
        capacityMinutes === null ? 'Capacity not configured' : 'Over capacity by 8 h',
      );
      expect(text(sheet())).not.toContain('NaN');
    });
  }

  it('does not merge unrelated tasks without intervention identities and preserves explicit zero', async () => {
    await changeDay({
      contributions: [
        { taskId: 'task-a', kind: 'actual', minutes: 0 },
        { taskId: 'task-b', kind: 'committed', minutes: 60 },
      ],
    });
    expect(rows()).toHaveLength(2);
    expect(rows()[0].querySelector('a')).toBeNull();
    expect(text(rows()[0])).toContain('task-a');
    expect(text(rows()[0].querySelector('dl'))).toBe('Time recorded 0 min');
    expect(text(rows()[1])).toContain('task-b');
    expect(text(rows()[1].querySelector('dl'))).toBe('Remaining committed work 1 h');
  });

  it('renders a quiet empty day without an excluded-work disclosure when no tasks are returned', async () => {
    fixture.componentRef.setInput('selection', {
      ...selection,
      day: {
        ...selection.day,
        contributions: [],
        actualMinutes: 0,
        remainingMinutes: 0,
        overloadMinutes: 0,
        utilizationPercent: 0,
        completeness: 'complete',
      },
      member: { ...selection.member, unallocated: [] },
    });
    await fixture.whenStable();
    expect(rows()).toHaveLength(0);
    expect(text(sheet())).toContain('No recorded or allocated work for this day.');
    expect(text(sheet())).not.toContain('Incomplete workload');
    expect(sheet().querySelector('#workload-day-excluded-trigger')).toBeNull();
  });

  it('emits native dismissal without editing the selected projection', async () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    sheet().querySelector<HTMLButtonElement>('hlm-sheet-footer button')?.click();
    await fixture.whenStable();
    expect(closed).toHaveBeenCalledOnce();
    expect(selection.day.actualMinutes).toBe(120);
  });
});
