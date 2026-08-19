import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionRecurrencesSheet,
  type InterventionRecurrenceFormSubmittedEvent,
} from '../intervention-recurrences-sheet.component';

const templates: readonly InterventionTemplateOutput[] = [
  { id: 'template-1', name: 'Annual inspection round' } as InterventionTemplateOutput,
];

const recurrence: InterventionRecurrenceOutput = {
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
};

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-recurrences-sheet"]') as HTMLElement;
const inSheet = (selector: string): HTMLElement => content().querySelector(selector) as HTMLElement;

/**
 * Minimal ResizeObserver stand-in: several spartan overlays (select, combobox,
 * date-picker) observe their anchor, and the test environment provides no
 * implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('InterventionRecurrencesSheet', () => {
  let fixture: ComponentFixture<InterventionRecurrencesSheet>;
  let submitted: InterventionRecurrenceFormSubmittedEvent[];
  let removed: string[];
  let toggled: Array<{ recurrenceId: string; isActive: boolean }>;
  let closed: number;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRecurrencesSheet);
    submitted = [];
    removed = [];
    toggled = [];
    closed = 0;
    fixture.componentInstance.submitted.subscribe((event) => submitted.push(event));
    fixture.componentInstance.removed.subscribe((id) => removed.push(id));
    fixture.componentInstance.activeToggled.subscribe((event) => toggled.push(event));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentRef.setInput('templates', templates);
    await fixture.whenStable();
  });

  it('should stay closed while `open` is false', () => {
    expect(content()).toBeNull();
  });

  it('should list every recurrence once open', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('recurrences', [recurrence]);
    await fixture.whenStable();

    expect(content().textContent).toContain('Monthly extinguisher check');
    expect(content().textContent).toContain('Annual inspection round');
  });

  it('should hide the "New recurrence" and per-row write affordances without canWrite', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('recurrences', [recurrence]);
    fixture.componentRef.setInput('canWrite', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="intervention-recurrences-new"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="intervention-recurrence-edit-recurrence-1"]'),
    ).toBeNull();
  });

  it('should emit a create submission with no recurrenceId', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-recurrences-new"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    fixture.componentInstance['draftName'].set('Quarterly check');
    fixture.componentInstance['draftTemplateId'].set('template-1');
    fixture.componentInstance['draftAnchorDate'].set(new Date('2026-04-01T00:00:00.000Z'));
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-recurrence-submit"]') as HTMLButtonElement).click();

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.recurrenceId).toBeNull();
    expect(submitted[0]?.name).toBe('Quarterly check');
    expect(submitted[0]?.templateId).toBe('template-1');
  });

  it('should seed the form from the edited row and submit its id', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('recurrences', [recurrence]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    (
      inSheet('[data-testid="intervention-recurrence-edit-recurrence-1"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(fixture.componentInstance['draftName']()).toBe('Monthly extinguisher check');

    (inSheet('[data-testid="intervention-recurrence-submit"]') as HTMLButtonElement).click();

    expect(submitted[0]?.recurrenceId).toBe('recurrence-1');
  });

  it('should show the anchor-drift hint past the 28th', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-recurrences-new"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    fixture.componentInstance['draftAnchorDate'].set(new Date('2026-01-31T00:00:00.000Z'));
    await fixture.whenStable();

    expect(content().textContent).toContain('Anchored past the 28th');
  });

  it('should emit removed only after the inline confirmation', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('recurrences', [recurrence]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    (
      inSheet('[data-testid="intervention-recurrence-remove-recurrence-1"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(removed).toEqual([]);

    (
      inSheet(
        '[data-testid="intervention-recurrence-remove-confirm-recurrence-1"]',
      ) as HTMLButtonElement
    ).click();

    expect(removed).toEqual(['recurrence-1']);
  });

  it('should emit activeToggled when the row switch is flipped', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('recurrences', [recurrence]);
    fixture.componentRef.setInput('canWrite', true);
    await fixture.whenStable();

    fixture.componentInstance['toggleActive']('recurrence-1', false);

    expect(toggled).toEqual([{ recurrenceId: 'recurrence-1', isActive: false }]);
  });

  it('should emit closed on dismissal', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('closed');

    expect(closed).toBe(1);
  });
});
