import { TestBed } from '@angular/core/testing';
import { InterventionCreateForm } from '../intervention-create-form.component';
import type { InterventionCreateFormValues } from '../models';

type TestApi = InterventionCreateForm & {
  form: {
    patchValue(values: Partial<InterventionCreateFormValues>): void;
  };
  onSubmit(): void;
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
});
