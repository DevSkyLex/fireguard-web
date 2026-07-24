import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { InterventionWorkItemAction } from '@features/organization/features/interventions/models';
import { InterventionDiscoveryForm } from '../intervention-discovery-form.component';
import type { InterventionDiscoveryFormValues } from '../models';

type TestApi = InterventionDiscoveryForm & {
  form: {
    controls: {
      action: { setValue(value: InterventionWorkItemAction): void };
      target: { setValue(value: string): void };
    };
    patchValue(values: { action: string; target: string; result: string }): void;
  };
  onSubmit(): void;
};

describe('InterventionDiscoveryForm', () => {
  let fixture: ComponentFixture<InterventionDiscoveryForm>;

  function build(): TestApi {
    fixture = TestBed.createComponent(InterventionDiscoveryForm);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as TestApi;
  }

  it('should render the field discovery heading', () => {
    build();

    expect(fixture.nativeElement.querySelector('#intervention-discovery-heading')).not.toBeNull();
  });

  it('should trim and emit a field discovery', () => {
    const component = build();
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
    } satisfies InterventionDiscoveryFormValues);
  });

  it('should render a free-text target input for a non-inventory action', () => {
    const component = build();
    component.form.controls.action.setValue('site_setup');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('input[pInputText]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('p-select[formcontrolname="target"]'))).toBeNull();
  });

  it('should render an equipment-type select for an inventory action', () => {
    const component = build();
    component.form.controls.action.setValue('inventory');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-select[formcontrolname="target"]'))).not.toBeNull();
  });

  it('should render the initial-result select only for an inspection action', () => {
    const component = build();

    component.form.controls.action.setValue('inspection');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('p-select[formcontrolname="result"]'))).not.toBeNull();

    component.form.controls.action.setValue('inventory');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('p-select[formcontrolname="result"]'))).toBeNull();
  });

  it('should surface a validation message when the target is touched and empty', () => {
    const component = build();
    component.form.controls.target.setValue('');
    component.onSubmit();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('#intervention-discovery-target-error'),
    ).not.toBeNull();
  });

  it('should disable the submit action while loading', () => {
    fixture = TestBed.createComponent(InterventionDiscoveryForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('p-button'));
    expect(button.componentInstance.loading).toBe(true);
  });
});
