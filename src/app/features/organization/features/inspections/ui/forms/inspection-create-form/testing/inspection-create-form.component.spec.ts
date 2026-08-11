import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import { InspectionCreateForm } from '../inspection-create-form.component';
import type { InspectionCreateFormDraft } from '../models';

describe('InspectionCreateForm', () => {
  let fixture: ComponentFixture<InspectionCreateForm>;
  let element: HTMLElement;

  const fill = async (testId: string, value: string): Promise<void> => {
    const input: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const setModel = async (draft: InspectionCreateFormDraft): Promise<void> => {
    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<InspectionCreateFormDraft>;
      }
    ).model.set(draft);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InspectionCreateForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should stay quiet until the form is touched', () => {
    expect(element.textContent).not.toContain('Choose the inspected equipment.');
  });

  it('should refuse to emit while required fields are missing, and show the reasons', async () => {
    const emitted: CreateInspectionInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateInspectionInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Choose the inspected equipment.');
    expect(element.textContent).toContain("Choose the inspection's result.");
    expect(element.textContent).toContain('Pick the date the inspection was carried out.');
    expect(element.textContent).toContain('Name the inspector.');
  });

  it('should emit the API-shaped payload once every required field is filled', async () => {
    const emitted: CreateInspectionInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateInspectionInput): void => {
      emitted.push(value);
    });

    await setModel({
      equipmentId: 'equipment-1',
      result: 'pass',
      performedAt: new Date('2026-08-10T00:00:00.000Z'),
      inspectorType: 'user',
      inspectorName: '',
    });
    await fill('inspection-create-inspector-name', 'Ada Lovelace');
    await submit();

    expect(emitted).toEqual([
      {
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-08-10T00:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'Ada Lovelace',
      },
    ]);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'equipmentId', message: 'This equipment does not exist.' }],
    });
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="inspection-create-error"]')?.textContent).toContain(
      'This equipment does not exist.',
    );
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="inspection-create-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Creating…');
  });
});
