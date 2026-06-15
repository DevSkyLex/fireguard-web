import { TestBed } from '@angular/core/testing';
import { InterventionDiscoveryForm } from '../intervention-discovery-form.component';

type TestApi = InterventionDiscoveryForm & {
  form: { patchValue(values: { action: 'inspection'; target: string; result: 'fail' }): void };
  onSubmit(): void;
};

describe('InterventionDiscoveryForm', () => {
  it('should trim and emit a field discovery', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(
      () => new InterventionDiscoveryForm() as unknown as TestApi,
    );
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    component.form.patchValue({
      action: 'inspection',
      target: ' /api/equipment/equipment-1 ',
      result: 'fail',
    });
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      action: 'inspection',
      target: '/api/equipment/equipment-1',
      result: 'fail',
    });
  });
});
