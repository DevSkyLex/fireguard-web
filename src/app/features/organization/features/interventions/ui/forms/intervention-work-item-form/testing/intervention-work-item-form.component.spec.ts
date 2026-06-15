import { TestBed } from '@angular/core/testing';
import { InterventionWorkItemForm } from '../intervention-work-item-form.component';

type TestApi = InterventionWorkItemForm & {
  form: { patchValue(values: { action: 'inspection'; target: string; assignee: string }): void };
  onSubmit(): void;
};

describe('InterventionWorkItemForm', () => {
  it('should emit a prepared work item', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(
      () => new InterventionWorkItemForm() as unknown as TestApi,
    );
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    component.form.patchValue({
      action: 'inspection',
      target: '/api/equipment/equipment-1',
      assignee: '/api/organizations/org-1/members/member-1',
    });
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      action: 'inspection',
      target: '/api/equipment/equipment-1',
      assignee: '/api/organizations/org-1/members/member-1',
    });
  });
});
