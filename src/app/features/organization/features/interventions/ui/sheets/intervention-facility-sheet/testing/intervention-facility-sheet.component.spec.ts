import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { FacilityCreateForm } from '@features/organization/features/facilities/ui/forms/facility-create-form';
import { InterventionFacilitySheet } from '../intervention-facility-sheet.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-facility-sheet"]') as HTMLElement;
const inSheet = (selector: string): HTMLElement => content().querySelector(selector) as HTMLElement;

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

const pressEscape = (): void => {
  content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('InterventionFacilitySheet', () => {
  let fixture: ComponentFixture<InterventionFacilitySheet>;
  let visibility: boolean[];
  let submissions: CreateFacilityInput[];

  const dirtyTheForm = (): void => {
    fixture.debugElement
      .query(By.directive(FacilityCreateForm))
      .componentInstance.dirtyChanged.emit(true);
  };

  const submitTheForm = (value: CreateFacilityInput): void => {
    fixture.debugElement
      .query(By.directive(FacilityCreateForm))
      .componentInstance.submitted.emit(value);
  };

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideInteractionCapabilities()],
    });

    fixture = TestBed.createComponent(InterventionFacilitySheet);
    await fixture.whenStable();

    visibility = [];
    submissions = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('should stay closed until the page opens it', () => {
    expect(content()).toBeNull();
  });

  it('should open when the page says so', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(content()).not.toBeNull();
    expect(content().textContent).toContain('Add facility');
  });

  it('should relay the form cancellation as a close request', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inSheet('[data-testid="facility-create-cancel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
  });

  it('should forward the payload the form validated, untouched', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const value: CreateFacilityInput = { type: 'building', name: 'Warehouse' };
    submitTheForm(value);

    expect(submissions).toEqual([value]);
  });

  it('should forward pending down to the form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect((inSheet('[data-testid="facility-create-submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('should forward the server error down to the form', async () => {
    const error = new Error('boom');
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('serverError', error);
    await fixture.whenStable();

    const form = fixture.debugElement.query(By.directive(FacilityCreateForm))
      .componentInstance as FacilityCreateForm;
    expect(form.serverError()).toBe(error);
    expect(inSheet('[data-testid="facility-create-error"]').textContent).toContain(
      'The facility could not be created.',
    );
  });

  it('should refuse to close while the creation request is in flight', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(content()).not.toBeNull();
  });

  it('should confirm before an Escape throws away a started facility', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
    expect(content()).not.toBeNull();
  });

  it('should confirm before Cancel throws away a started facility', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    (inSheet('[data-testid="facility-create-cancel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close once the planner confirms the discard', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should forget a stale draft once the panel has closed', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });
});
