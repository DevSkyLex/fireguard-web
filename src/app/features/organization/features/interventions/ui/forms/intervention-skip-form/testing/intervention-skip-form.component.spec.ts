import { TestBed } from '@angular/core/testing';
import { InterventionSkipForm } from '../intervention-skip-form.component';

type TestApi = InterventionSkipForm & {
  form: { controls: { reason: { setValue(value: string): void } } };
  onSubmit(): void;
};

describe('InterventionSkipForm', () => {
  it('should trim and emit the skip reason', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(
      () => new InterventionSkipForm() as unknown as TestApi,
    );
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    component.form.controls.reason.setValue(' Access blocked ');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ reason: 'Access blocked' });
  });
});
