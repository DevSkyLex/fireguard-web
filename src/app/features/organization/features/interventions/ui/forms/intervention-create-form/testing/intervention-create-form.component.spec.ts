import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InterventionCreateForm } from '../intervention-create-form.component';
import type { InterventionCreateFormValues } from '../models';

type TestApi = InterventionCreateForm & {
  form: {
    patchValue(values: Partial<InterventionCreateFormValues>): void;
  };
  onSubmit(): void;
};

type FormControlApi = {
  value: Date | null;
  markAsTouched(): void;
};

type PrefillApi = InterventionCreateForm & {
  form: { controls: { plannedStartAt: FormControlApi } };
};

describe('InterventionCreateForm', () => {
  it('should emit typed draft values when valid', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(
      () => new InterventionCreateForm() as unknown as TestApi,
    );
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    component.form.patchValue({ name: 'Quarterly inspection', type: 'inspection_campaign' });
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Quarterly inspection',
        type: 'inspection_campaign',
        priority: 'normal',
      }),
    );
  });

  it('should pre-fill the planned start from initialPlannedStartAt while untouched', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(InterventionCreateForm);
    const date = new Date(2026, 5, 15, 9, 0, 0);

    fixture.componentRef.setInput('initialPlannedStartAt', date);
    fixture.detectChanges();

    const api = fixture.componentInstance as unknown as PrefillApi;
    expect(api.form.controls.plannedStartAt.value).toEqual(date);
  });

  it('should not overwrite a touched planned start', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(InterventionCreateForm);
    const api = fixture.componentInstance as unknown as PrefillApi;

    api.form.controls.plannedStartAt.markAsTouched();
    fixture.componentRef.setInput('initialPlannedStartAt', new Date(2026, 5, 15, 9, 0, 0));
    fixture.detectChanges();

    expect(api.form.controls.plannedStartAt.value).toBeNull();
  });
});
