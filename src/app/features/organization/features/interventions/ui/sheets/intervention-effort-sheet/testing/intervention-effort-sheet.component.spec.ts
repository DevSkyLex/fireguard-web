import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import type {
  InterventionWorkItemOutput,
  UpdateInterventionWorkItemInput,
} from '@features/organization/features/interventions/models';
import { InterventionEffortForm } from '@features/organization/features/interventions/ui/forms/intervention-effort-form';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionEffortSheet } from '../intervention-effort-sheet.component';

/**
 * Constant item
 * @description Minimal task for exercising sheet-to-form orchestration.
 * @since 1.0.0
 */
const item: InterventionWorkItemOutput = {
  '@id': '/api/interventions/visit/work-items/task-1',
  '@type': 'InterventionWorkItem',
  id: 'task-1',
  intervention: '/api/interventions/visit',
  action: 'inspection',
  target: null,
  resultResource: null,
  assignee: null,
  source: 'planned',
  status: 'in_progress',
  required: true,
  skipReason: null,
  evidenceCount: 0,
  revision: 3,
  createdAt: '2026-09-21T09:00:00Z',
  updatedAt: '2026-09-21T09:00:00Z',
  remainingMinutes: 60,
};

describe('InterventionEffortSheet', () => {
  let fixture: ComponentFixture<InterventionEffortSheet>;
  let closed: ReturnType<typeof vi.fn<() => void>>;
  let writes: UpdateInterventionWorkItemInput[];

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.configureTestingModule({ providers: [provideInteractionCapabilities()] });
    fixture = TestBed.createComponent(InterventionEffortSheet);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('mode', 'remaining');
    closed = vi.fn<() => void>();
    writes = [];
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('passes scope and request state to the form and forwards the exact effort command', async () => {
    fixture.componentRef.setInput('workloadOrganizationId', 'org-1');
    fixture.componentRef.setInput('workloadStartsOn', '2026-09-21');
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-22');
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(InterventionEffortForm))
      .componentInstance as InterventionEffortForm;
    expect(form.item()).toEqual(item);
    expect(form.mode()).toBe('remaining');
    expect(form.workloadOrganizationId()).toBe('org-1');
    expect(form.workloadStartsOn()).toBe('2026-09-21');
    expect(form.workloadEndsOn()).toBe('2026-09-22');
    form.submitted.emit({ remainingMinutes: 30 });
    expect(writes).toEqual([{ remainingMinutes: 30 }]);
  });

  it('closes immediately when the form is pristine', () => {
    fixture.componentInstance['requestClose']();
    expect(closed).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['discard']()).toBe(false);
  });

  it('keeps an accepted write open even if the form is pristine', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.componentInstance['requestClose']();
    expect(closed).not.toHaveBeenCalled();
    const form = fixture.debugElement.query(By.directive(InterventionEffortForm))
      .componentInstance as InterventionEffortForm;
    expect(form.pending()).toBe(true);
    expect(fixture.componentInstance['discard']()).toBe(false);
  });

  it('requires an explicit discard for a dirty form and respects cancelling that confirmation', async () => {
    const form = fixture.debugElement.query(By.directive(InterventionEffortForm))
      .componentInstance as InterventionEffortForm;
    form.dirtyChanged.emit(true);
    fixture.componentInstance['requestClose']();
    await fixture.whenStable();
    expect(closed).not.toHaveBeenCalled();
    expect(fixture.componentInstance['discard']()).toBe(true);
    const dialog = fixture.debugElement.query(By.directive(UnsavedChangesDialog))
      .componentInstance as UnsavedChangesDialog;
    dialog.dismissed.emit();
    expect(fixture.componentInstance['discard']()).toBe(false);
    fixture.componentInstance['requestClose']();
    dialog.confirmed.emit();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('shows write failure and offline workload uncertainty without discarding the draft', async () => {
    const form = fixture.debugElement.query(By.directive(InterventionEffortForm))
      .componentInstance as InterventionEffortForm;
    form.dirtyChanged.emit(true);
    fixture.componentRef.setInput('online', false);
    fixture.componentRef.setInput('error', 'The task revision changed. Review your input.');
    await fixture.whenStable();
    expect(document.body.textContent).toContain('Assignment workload is unverified until');
    expect(document.body.textContent).toContain('The task revision changed. Review your input.');
    expect(fixture.componentInstance['dirty']()).toBe(true);
    expect(closed).not.toHaveBeenCalled();
  });
});
