import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { OrganizationTodayQueue } from '../organization-today-queue.component';

function intervention(overrides: Partial<InterventionOutput> = {}): InterventionOutput {
  return {
    id: 'i-1',
    organization: '/api/organizations/org-1',
    number: 1,
    type: 'inspection_campaign',
    name: 'Roof check',
    description: null,
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 1,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    '@id': '/api/interventions/i-1',
    '@type': 'Intervention',
    ...overrides,
  } as InterventionOutput;
}

interface RenderOptions {
  readonly total: number;
  readonly interventions?: readonly InterventionOutput[];
  readonly notes?: Readonly<Record<string, string>>;
  readonly loading?: boolean;
  readonly actionLabel?: string;
}

describe('OrganizationTodayQueue', () => {
  let fixture: ComponentFixture<OrganizationTodayQueue>;

  const render = (options: RenderOptions): ComponentFixture<OrganizationTodayQueue> => {
    fixture = TestBed.createComponent(OrganizationTodayQueue);
    fixture.componentRef.setInput('label', 'Overdue');
    fixture.componentRef.setInput('total', options.total);
    if (options.interventions !== undefined)
      fixture.componentRef.setInput('interventions', options.interventions);
    if (options.notes !== undefined) fixture.componentRef.setInput('notes', options.notes);
    if (options.loading !== undefined) fixture.componentRef.setInput('loading', options.loading);
    if (options.actionLabel !== undefined)
      fixture.componentRef.setInput('actionLabel', options.actionLabel);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrganizationTodayQueue] });
  });

  it('should render nothing when the queue is empty and not loading', () => {
    render({ total: 0, loading: false });

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should render skeleton placeholders while loading', () => {
    render({ total: 0, loading: true });

    expect(fixture.debugElement.queryAll(By.css('p-skeleton'))).toHaveLength(2);
    expect(fixture.debugElement.queryAll(By.css('button'))).toHaveLength(0);
  });

  it('should render one clickable row per intervention and emit it when activated', () => {
    const first = intervention({ id: 'i-1', number: 12 });
    const second = intervention({ id: 'i-2', number: 34 });
    render({ total: 2, interventions: [first, second] });

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons).toHaveLength(2);

    let opened: InterventionOutput | undefined;
    fixture.componentInstance.opened.subscribe((value: InterventionOutput) => (opened = value));
    buttons[0].nativeElement.click();

    expect(opened).toEqual(first);
  });

  it('should show the note keyed by intervention id and render no second line without one', () => {
    const noted = intervention({ id: 'i-1' });
    const silent = intervention({ id: 'i-2' });
    render({
      total: 2,
      interventions: [noted, silent],
      notes: { 'i-1': '3 days late' },
    });

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons[0].nativeElement.textContent).toContain('3 days late');
    expect(buttons[0].query(By.css('.truncate.text-xs'))).not.toBeNull();
    expect(buttons[1].nativeElement.textContent).not.toContain('3 days late');
    expect(buttons[1].query(By.css('.truncate.text-xs'))).toBeNull();
  });

  it('should render the trailing action only when a label is provided, and emit when activated', () => {
    render({ total: 1, interventions: [intervention()] });
    expect(fixture.debugElement.query(By.css('button.p-button'))).toBeNull();

    render({ total: 1, interventions: [intervention()], actionLabel: 'See all' });
    const action = fixture.debugElement.query(By.css('button.p-button'));
    expect(action).not.toBeNull();

    let actioned = false;
    fixture.componentInstance.actioned.subscribe(() => (actioned = true));
    action?.nativeElement.click();

    expect(actioned).toBe(true);
  });
});
