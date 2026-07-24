import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InterventionSkipForm } from '../intervention-skip-form.component';

type TestApi = InterventionSkipForm & {
  form: { controls: { reason: { setValue(value: string): void } } };
  onSubmit(): void;
};

describe('InterventionSkipForm', () => {
  let fixture: ComponentFixture<InterventionSkipForm>;

  function build(): TestApi {
    fixture = TestBed.createComponent(InterventionSkipForm);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as TestApi;
  }

  it('should render the skip heading', () => {
    build();

    expect(fixture.nativeElement.querySelector('#intervention-skip-heading')).not.toBeNull();
  });

  it('should trim and emit the skip reason', () => {
    const component = build();
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    component.form.controls.reason.setValue(' Access blocked ');
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith({ reason: 'Access blocked' });
  });

  it('should surface a validation message when the reason is empty on submit', () => {
    const component = build();

    component.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#intervention-skip-reason-error')).not.toBeNull();
  });

  it('should not surface a validation message before the field is touched', () => {
    build();

    expect(fixture.nativeElement.querySelector('#intervention-skip-reason-error')).toBeNull();
  });

  it('should disable the submit action while loading', () => {
    fixture = TestBed.createComponent(InterventionSkipForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('p-button'));
    expect(button.componentInstance.loading).toBe(true);
  });
});
