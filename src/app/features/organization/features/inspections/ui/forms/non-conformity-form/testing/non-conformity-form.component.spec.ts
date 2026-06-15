import { TestBed } from '@angular/core/testing';
import { NonConformityForm } from '../non-conformity-form.component';

type TestApi = NonConformityForm & {
  form: {
    patchValue(values: { description: string; severity: 'high'; dueAt: Date; notes: string }): void;
  };
  submit(): void;
};

describe('NonConformityForm', () => {
  it('should emit raw form values and leave API serialization to its parent', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(
      () => new NonConformityForm() as unknown as TestApi,
    );
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const dueAt = new Date('2026-06-20T08:00:00.000Z');

    component.form.patchValue({
      description: 'Emergency exit blocked',
      severity: 'high',
      dueAt,
      notes: 'Clear immediately',
    });
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({
      description: 'Emergency exit blocked',
      severity: 'high',
      dueAt,
      notes: 'Clear immediately',
    });
  });
});
