import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  MaintenancePlanOccurrenceOutput,
  MaintenancePlanOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenancePlanList } from '../maintenance-plan-list.component';

describe('MaintenancePlanList', () => {
  let fixture: ComponentFixture<MaintenancePlanList>;
  const organizationId = '019bd877-9628-756a-a6ea-e0ea1b025711';
  const equipmentId = '019bd877-9628-756a-a6ea-e0ea1b025712';
  const interventionId = '019bd877-9628-756a-a6ea-e0ea1b025715';
  const occurrence: MaintenancePlanOccurrenceOutput = {
    id: '019bd877-9628-756a-a6ea-e0ea1b025714',
    dueAt: '2026-01-01T00:00:00Z',
    attempt: 2,
    interventionId,
    status: 'open',
    retryAllowed: false,
  };
  const plan: MaintenancePlanOutput = {
    '@id':
      '/api/organizations/' +
      organizationId +
      '/maintenance/plans/019bd877-9628-756a-a6ea-e0ea1b025713',
    '@type': 'MaintenancePlan',
    id: '019bd877-9628-756a-a6ea-e0ea1b025713',
    organizationId,
    equipmentId,
    equipmentType: 'fire_extinguisher',
    name: 'Annual control',
    operationKind: 'control',
    interval: 'P1Y',
    cadenceMode: 'legacy',
    anchorAt: null,
    nextDueAt: null,
    active: true,
    openOccurrence: occurrence,
  };

  /**
   * Function root
   *
   * @description
   * Provides the rendered list boundary for observable action and date assertions.
   *
   * @returns {HTMLElement} Current fixture host.
   */
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /**
   * Function button
   *
   * @description
   * Finds an action by its user-visible label.
   *
   * @param {string} label - Exact rendered action label.
   *
   * @returns {HTMLButtonElement | undefined} Matching action, absent when not offered.
   */
  const button = (label: string): HTMLButtonElement | undefined =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    );

  /**
   * Function click
   *
   * @description
   * Activates an offered action and fails clearly when the expected control is absent.
   *
   * @param {string} label - Exact rendered action label.
   *
   * @returns {void} Dispatches a native click.
   */
  const click = (label: string): void => {
    const action = button(label);
    if (!action) throw new Error('Missing button ' + label);
    action.click();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MaintenancePlanList],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(MaintenancePlanList);
    fixture.componentRef.setInput('organizationId', organizationId);
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'UTC',
    });
    fixture.componentRef.setInput('plans', [plan]);
    fixture.detectChanges();
  });

  it('retains server deadlines, attempts and historical cadence without claiming completion', () => {
    expect(root().textContent).toContain('Historical cadence retained');
    expect(root().textContent).toContain('Control');
    expect(root().textContent).toContain('1 year');
    expect(root().textContent).toContain('First deadline to configure');
    expect(root().textContent).toContain('Original deadline: 2026-01-01');
    expect(root().textContent).toContain('attempt 2');
    expect(root().querySelector('a')?.getAttribute('href')).toBe(
      '/organizations/' + organizationId + '/equipments/' + equipmentId,
    );
    expect(root().querySelector('a[href$="/interventions/' + interventionId + '"]')).not.toBeNull();
    expect(root().textContent).not.toContain('Completed');
  });

  it('emits the selected server plan from both public preview controls', () => {
    const previews: MaintenancePlanOutput[] = [];
    fixture.componentInstance.previewRequested.subscribe((value) => previews.push(value));
    click('Annual control');
    click('Preview dates');
    expect(previews).toEqual([plan, plan]);
  });

  it.each([
    { canManage: false, canGenerate: false, active: true, configure: false, generate: false },
    { canManage: true, canGenerate: false, active: true, configure: true, generate: false },
    { canManage: false, canGenerate: true, active: true, configure: false, generate: true },
    { canManage: true, canGenerate: true, active: true, configure: true, generate: true },
    { canManage: true, canGenerate: true, active: false, configure: true, generate: false },
    { canManage: false, canGenerate: true, active: false, configure: false, generate: false },
  ])(
    'offers actions for manage=$canManage generate=$canGenerate active=$active',
    ({ canManage, canGenerate, active, configure, generate }) => {
      fixture.componentRef.setInput('canManage', canManage);
      fixture.componentRef.setInput('canGenerate', canGenerate);
      fixture.componentRef.setInput('plans', [
        { ...plan, active, openOccurrence: { ...occurrence, retryAllowed: true } },
      ]);
      fixture.detectChanges();
      expect(button('Configure') !== undefined).toBe(configure);
      expect(button('Prepare intervention') !== undefined).toBe(generate);
      expect(button('Start a new attempt') !== undefined).toBe(generate);
      expect(button('Preview dates')).toBeDefined();
      expect(root().textContent?.includes('Prepared')).toBe(!active);
    },
  );

  it('emits configuration only for the selected server plan', () => {
    const edits: MaintenancePlanOutput[] = [];
    fixture.componentInstance.editRequested.subscribe((value) => edits.push(value));
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    click('Configure');
    expect(edits).toEqual([plan]);
  });

  it.each([false, undefined])(
    'keeps ordinary generation separate when retryAllowed=%s',
    (retryAllowed) => {
      const generations: { planId: string; retry: boolean }[] = [];
      fixture.componentInstance.generationRequested.subscribe((value) => generations.push(value));
      fixture.componentRef.setInput('canGenerate', true);
      fixture.componentRef.setInput('plans', [
        { ...plan, openOccurrence: { ...occurrence, retryAllowed } },
      ]);
      fixture.detectChanges();
      expect(button('Start a new attempt')).toBeUndefined();
      click('Prepare intervention');
      expect(generations).toEqual([{ planId: plan.id, retry: false }]);
      expect(root().textContent).toContain('Original deadline: 2026-01-01');
      expect(root().textContent).toContain('attempt 2');
    },
  );

  it('emits an explicit retry independently from ordinary recovery without altering the deadline', () => {
    const generations: { planId: string; retry: boolean }[] = [];
    fixture.componentInstance.generationRequested.subscribe((value) => generations.push(value));
    fixture.componentRef.setInput('canGenerate', true);
    fixture.componentRef.setInput('plans', [
      { ...plan, openOccurrence: { ...occurrence, retryAllowed: true } },
    ]);
    fixture.detectChanges();
    click('Prepare intervention');
    click('Start a new attempt');
    expect(generations).toEqual([
      { planId: plan.id, retry: false },
      { planId: plan.id, retry: true },
    ]);
    expect(root().textContent).toContain('Original deadline: 2026-01-01');
    expect(root().textContent).toContain('attempt 2');
  });

  it('locks accepted mutations while pending and permits the same actions after settling', () => {
    const generations: { planId: string; retry: boolean }[] = [];
    const edits: MaintenancePlanOutput[] = [];
    fixture.componentInstance.generationRequested.subscribe((value) => generations.push(value));
    fixture.componentInstance.editRequested.subscribe((value) => edits.push(value));
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('canGenerate', true);
    fixture.componentRef.setInput('plans', [
      { ...plan, openOccurrence: { ...occurrence, retryAllowed: true } },
    ]);
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    for (const label of ['Configure', 'Prepare intervention', 'Start a new attempt']) {
      expect(button(label)?.disabled).toBe(true);
      click(label);
    }
    expect(edits).toEqual([]);
    expect(generations).toEqual([]);
    fixture.componentRef.setInput('pending', false);
    fixture.detectChanges();
    click('Prepare intervention');
    expect(generations).toEqual([{ planId: plan.id, retry: false }]);
    expect(button('Configure')?.disabled).toBe(false);
    expect(button('Start a new attempt')?.disabled).toBe(false);
  });

  it('renders a prepared maintenance calendar without implying existing work', () => {
    fixture.componentRef.setInput('plans', [
      {
        ...plan,
        operationKind: 'maintenance',
        cadenceMode: 'fixed',
        nextDueAt: '2026-03-31T00:00:00+02:00',
        active: false,
        openOccurrence: null,
      },
    ]);
    fixture.detectChanges();
    expect(root().textContent).toContain('Maintenance');
    expect(root().textContent).toContain('Anchored calendar');
    expect(root().textContent).toContain('Prepared');
    expect(root().textContent).toContain('Next due: 2026-03-31');
    expect(root().textContent).not.toContain('Original deadline:');
    expect(root().textContent).not.toContain('Open existing intervention');
  });

  it('omits an intervention link when the server has not linked work to the occurrence', () => {
    fixture.componentRef.setInput('plans', [
      { ...plan, openOccurrence: { ...occurrence, interventionId: null } },
    ]);
    fixture.detectChanges();
    expect(root().textContent).toContain('attempt 2');
    expect(root().textContent).not.toContain('Open existing intervention');
  });

  it('keeps an invalid historical interval visible as an unavailable duration', () => {
    fixture.componentRef.setInput('plans', [{ ...plan, interval: 'unsupported' }]);
    fixture.detectChanges();
    expect(root().textContent).toContain('Historical cadence retained · —');
  });

  it.each(['2026-03-31T00:00:00Z', '2026-03-31T00:00:00+02:00', '2026-03-31T00:00:00-07:00'])(
    'keeps fixed calendar deadline %s on its server date in a negative viewer timezone',
    (date) => {
      fixture.componentRef.setInput('regionalFormatting', {
        dateFormat: 'yyyy-MM-dd',
        timezone: 'America/Los_Angeles',
      });
      fixture.componentRef.setInput('plans', [
        {
          ...plan,
          cadenceMode: 'fixed',
          nextDueAt: date,
          openOccurrence: { ...occurrence, dueAt: date },
        },
      ]);
      fixture.detectChanges();
      expect(root().textContent).toContain('Next due: 2026-03-31');
      expect(root().textContent).toContain('Original deadline: 2026-03-31');
      expect(root().textContent).not.toContain('2026-03-30');
    },
  );

  it('continues to render historical deadlines as instants in the viewer organization timezone', () => {
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'America/Los_Angeles',
    });
    fixture.componentRef.setInput('plans', [
      { ...plan, nextDueAt: '2026-03-31T00:00:00+02:00', openOccurrence: null },
    ]);
    fixture.detectChanges();
    expect(root().textContent).toContain('Next due: 2026-03-30');
  });

  it('clears rendered rows when the parent provides an empty server page', () => {
    fixture.componentRef.setInput('plans', []);
    fixture.detectChanges();
    expect(root().querySelector('[data-testid^="maintenance-plan-"]')).toBeNull();
    expect(button('Preview dates')).toBeUndefined();
  });
});
