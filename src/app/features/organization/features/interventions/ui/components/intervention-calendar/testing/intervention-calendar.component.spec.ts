import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendar } from '../intervention-calendar.component';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'itv-1',
    organization: '/api/organizations/1',
    number: 101,
    type: 'site_setup',
    name: 'Check the riser',
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
    hasSignature: false,
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

describe('InterventionCalendar', () => {
  let fixture: ComponentFixture<InterventionCalendar>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(
    options: {
      mine?: boolean;
      currentMemberIri?: string | null;
      interventions?: readonly InterventionOutput[];
      loadError?: StoreError | null;
    } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(InterventionCalendar);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('interventions', options.interventions ?? []);
    fixture.componentRef.setInput('mine', options.mine ?? false);
    fixture.componentRef.setInput('currentMemberIri', options.currentMemberIri ?? null);
    fixture.componentRef.setInput('loadError', options.loadError ?? null);
    await fixture.whenStable();
  }

  it('reports the displayed anchor once on creation', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(InterventionCalendar);
    fixture.componentRef.setInput('organizationId', 'org-1');
    const months: Date[] = [];
    fixture.componentInstance.monthChanged.subscribe((month) => months.push(month));

    await fixture.whenStable();

    expect(months).toHaveLength(1);
  });

  it('emits monthChanged when the operator steps to the next month', async () => {
    await render();
    const months: Date[] = [];
    fixture.componentInstance.monthChanged.subscribe((month) => months.push(month));

    fixture.componentInstance['stepMonth'](1);
    await fixture.whenStable();

    expect(months).toHaveLength(1);
  });

  it("lists the selected day's interventions in the day panel, placed by plannedStartAt falling back to dueAt", async () => {
    const today: string = new Date().toISOString().slice(0, 10);
    await render({
      interventions: [
        intervention({ id: 'a', name: 'Riser check', plannedStartAt: `${today}T09:00:00+00:00` }),
        intervention({ id: 'b', name: 'Extinguisher swap', dueAt: `${today}T14:00:00+00:00` }),
      ],
    });
    fixture.componentInstance['selectedDay'].set(today);
    await fixture.whenStable();

    const panel = root().querySelector('[data-testid="intervention-calendar-day-panel"]');
    const rows = panel?.querySelectorAll('[data-testid="intervention-calendar-entry"]');
    expect(rows).toHaveLength(2);
    expect(panel?.textContent).toContain('Riser check');
    expect(panel?.textContent).toContain('Extinguisher swap');
  });

  it('scopes the visible interventions to the signed-in member when mine is set and the member IRI resolved', async () => {
    const memberIri = '/api/organizations/org-1/members/m1';
    await render({
      mine: true,
      currentMemberIri: memberIri,
      interventions: [
        intervention({ id: 'mine', responsible: memberIri }),
        intervention({ id: 'not-mine', responsible: '/api/organizations/org-1/members/m2' }),
      ],
    });

    expect(
      fixture.componentInstance['visibleInterventions']().map(
        (item: InterventionOutput) => item.id,
      ),
    ).toEqual(['mine']);
  });

  it('renders the error state and emits reloadRequested on demand', async () => {
    await render({ loadError: { message: 'boom' } as StoreError });
    expect(root().querySelector('[data-testid="intervention-calendar-retry"]')).not.toBeNull();

    const reloads: void[] = [];
    fixture.componentInstance.reloadRequested.subscribe(() => reloads.push(undefined));
    root().querySelector<HTMLButtonElement>('[data-testid="intervention-calendar-retry"]')?.click();

    expect(reloads).toHaveLength(1);
  });
});
