import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import { InterventionRecurrenceTable } from '../intervention-recurrence-table.component';

const templates: readonly InterventionTemplateOutput[] = [
  { id: 'template-1', name: 'Annual inspection round' } as InterventionTemplateOutput,
];

const recurrence = (
  overrides: Partial<InterventionRecurrenceOutput> = {},
): InterventionRecurrenceOutput =>
  ({
    '@id': '/api/intervention-recurrences/recurrence-1',
    '@type': 'InterventionRecurrence',
    id: 'recurrence-1',
    organization: '/api/organizations/org-1',
    template: '/api/intervention-templates/template-1',
    name: 'Monthly extinguisher check',
    site: null,
    responsible: null,
    frequency: 'monthly',
    interval: 1,
    anchorDate: '2026-01-15T00:00:00Z',
    timezone: 'Europe/Paris',
    leadTimeDays: 7,
    nextOccurrenceAt: '2026-02-15T00:00:00Z',
    lastMaterializedAt: null,
    isActive: true,
    endAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }) as InterventionRecurrenceOutput;

describe('InterventionRecurrenceTable', () => {
  let fixture: ComponentFixture<InterventionRecurrenceTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRecurrenceTable);
    fixture.componentRef.setInput('recurrences', []);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();
  });

  it('should draw skeleton rows while loading and nothing has loaded yet', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelector('[role="status"]')).not.toBeNull();
  });

  it('should not show skeleton rows once recurrences are already on screen', async () => {
    fixture.componentRef.setInput('recurrences', [recurrence()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should show the empty state when there are no recurrences', () => {
    expect(byTestId('intervention-recurrences-empty')).not.toBeNull();
  });

  it('should surface a fetch error as an alert instead of the grid', async () => {
    fixture.componentRef.setInput('error', 'Recurrences could not be loaded.');
    await fixture.whenStable();

    const alert = byTestId('intervention-recurrences-error');

    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Recurrences could not be loaded.');
    expect(byTestId('intervention-recurrences-empty')).toBeNull();
  });

  it('should prefer the loading skeleton over the error state while a fetch is still in flight', async () => {
    fixture.componentRef.setInput('error', 'Recurrences could not be loaded.');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(byTestId('intervention-recurrences-error')).toBeNull();
    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should render a row with its name, resolved template and cadence', async () => {
    fixture.componentRef.setInput('recurrences', [
      recurrence({ name: 'Quarterly fire door check', frequency: 'quarterly', interval: 2 }),
    ]);
    await fixture.whenStable();

    const row = byTestId('intervention-recurrence-row-recurrence-1') as HTMLElement;

    expect(row.textContent).toContain('Quarterly fire door check');
    expect(row.textContent).toContain('Annual inspection round');
    expect(row.textContent).toContain('2× Quarterly');
  });

  it('should hide the edit/delete affordances without canWrite', async () => {
    fixture.componentRef.setInput('recurrences', [recurrence()]);
    fixture.componentRef.setInput('canWrite', false);
    await fixture.whenStable();

    expect(byTestId('intervention-recurrence-edit-recurrence-1')).toBeNull();
    expect(byTestId('intervention-recurrence-remove-recurrence-1')).toBeNull();
  });

  it('should emit editRequested with the row when Edit is pressed', async () => {
    fixture.componentRef.setInput('recurrences', [recurrence()]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    const requested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(requested);
    byTestId('intervention-recurrence-edit-recurrence-1')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(requested).toHaveBeenCalledTimes(1);
    expect(requested.mock.calls[0]?.[0]?.id).toBe('recurrence-1');
  });

  it('should emit removed only after the inline confirmation', async () => {
    fixture.componentRef.setInput('recurrences', [recurrence()]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    const removed = vi.fn();
    fixture.componentInstance.removed.subscribe(removed);

    byTestId('intervention-recurrence-remove-recurrence-1')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(removed).not.toHaveBeenCalled();
    expect(byTestId('intervention-recurrence-remove-confirm-recurrence-1')).not.toBeNull();

    byTestId('intervention-recurrence-remove-confirm-recurrence-1')?.dispatchEvent(
      new Event('click'),
    );

    expect(removed).toHaveBeenCalledExactlyOnceWith('recurrence-1');
  });

  it('should collapse a pending delete confirmation once the embedded form opens', async () => {
    fixture.componentRef.setInput('recurrences', [recurrence()]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    byTestId('intervention-recurrence-remove-recurrence-1')?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(byTestId('intervention-recurrence-remove-confirm-recurrence-1')).not.toBeNull();

    fixture.componentRef.setInput('formOpen', true);
    await fixture.whenStable();

    expect(byTestId('intervention-recurrence-remove-confirm-recurrence-1')).toBeNull();
  });

  it('should emit activeToggled when a row switch is flipped', () => {
    fixture.componentInstance['toggleActive']('recurrence-1', false);

    let toggled: { recurrenceId: string; isActive: boolean } | undefined;
    fixture.componentInstance.activeToggled.subscribe((event) => (toggled = event));
    fixture.componentInstance['toggleActive']('recurrence-1', false);

    expect(toggled).toEqual({ recurrenceId: 'recurrence-1', isActive: false });
  });
});
