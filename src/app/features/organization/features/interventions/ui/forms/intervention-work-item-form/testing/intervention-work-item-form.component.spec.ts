import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InterventionWorkItemForm } from '../intervention-work-item-form.component';
import type { InterventionWorkItemFormValues } from '../models';

type TestApi = InterventionWorkItemForm & {
  form: {
    controls: { action: { setValue(value: string): void } };
    patchValue(values: { action: string; target: string; assignee: string }): void;
  };
  onSubmit(): void;
};

describe('InterventionWorkItemForm', () => {
  let fixture: ComponentFixture<InterventionWorkItemForm>;

  function build(): TestApi {
    fixture = TestBed.createComponent(InterventionWorkItemForm);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as TestApi;
  }

  it('should render the work item heading', () => {
    build();

    expect(fixture.nativeElement.querySelector('#work-item-heading')).not.toBeNull();
  });

  it('should emit a prepared work item', () => {
    const component = build();
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
    } satisfies InterventionWorkItemFormValues);
  });

  it('should render target and assignee selects', () => {
    build();

    expect(
      fixture.debugElement.query(By.css('p-select[formcontrolname="target"]')),
    ).not.toBeNull();
    expect(
      fixture.debugElement.query(By.css('p-select[formcontrolname="assignee"]')),
    ).not.toBeNull();
  });

  it('should disable the submit action while loading', () => {
    fixture = TestBed.createComponent(InterventionWorkItemForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('p-button'));
    expect(button.componentInstance.loading).toBe(true);
  });

  it('should disable the form controls when forbidden', () => {
    const component = build();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((component as unknown as InterventionWorkItemForm & { form: { disabled: boolean } }).form
      .disabled).toBe(true);
  });
});
