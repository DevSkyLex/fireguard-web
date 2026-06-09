import { TestBed } from '@angular/core/testing';
import { ChecklistForm } from '../checklist-form.component';

type ChecklistFormTestApi = ChecklistForm & {
  form: {
    controls: {
      name: { setValue(value: string): void };
    };
  };
  items: {
    readonly length: number;
    at(index: number): {
      setValue(value: { label: string; description: string; required: boolean }): void;
    };
  };
  addItem(): void;
  removeItem(index: number): void;
  onSubmit(): void;
};

describe('ChecklistForm', () => {
  let component: ChecklistFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new ChecklistForm() as unknown as ChecklistFormTestApi,
    );
  });

  it('should keep at least one dynamic checklist line', () => {
    expect(component.items.length).toBe(1);
    component.addItem();
    expect(component.items.length).toBe(2);
    component.removeItem(1);
    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('should emit valid checklist values', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.items.at(0).setValue({
      label: 'Check extinguisher',
      description: 'Verify pressure',
      required: true,
    });
    component.form.controls.name.setValue('Annual audit');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      name: 'Annual audit',
      version: '1.0',
      items: [
        {
          label: 'Check extinguisher',
          description: 'Verify pressure',
          required: true,
        },
      ],
    });
  });
});
