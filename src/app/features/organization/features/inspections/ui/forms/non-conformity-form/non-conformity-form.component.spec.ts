import { TestBed } from '@angular/core/testing';
import { NonConformityForm } from './non-conformity-form.component';

describe('NonConformityForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformityForm],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the add-non-conformity submit label', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Add non-conformity');
  });

  it('should not emit submitted and should mark controls as touched when the form is invalid', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
    const component = fixture.componentInstance as unknown as {
      form: { controls: { description: { touched: boolean } } };
    };
    expect(component.form.controls.description.touched).toBe(true);
  });

  it('should surface a validation message for a too-short description', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'A description of at least 3 characters is required.',
    );
  });

  it('should emit raw form values and keep them until the submission is accepted', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    const dueAt = new Date('2026-06-20T08:00:00.000Z');

    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue(values: {
          description: string;
          severity: 'high';
          dueAt: Date;
          notes: string;
        }): void;
        value: { description: string; severity: string; dueAt: Date | null; notes: string };
      };
    };
    component.form.patchValue({
      description: 'Emergency exit blocked',
      severity: 'high',
      dueAt,
      notes: 'Clear immediately',
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      description: 'Emergency exit blocked',
      severity: 'high',
      dueAt,
      notes: 'Clear immediately',
    });
    // The parent has not confirmed anything yet, and this form stays mounted:
    // clearing here used to wipe a finding the server then refused.
    expect(component.form.value).toEqual({
      description: 'Emergency exit blocked',
      severity: 'high',
      dueAt,
      notes: 'Clear immediately',
    });
  });

  it('should clear itself once a submission completes without error', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue(values: Record<string, unknown>): void;
        value: { description: string; severity: string; dueAt: Date | null; notes: string };
      };
    };
    component.form.patchValue({ description: 'Blocked exit', severity: 'high', notes: 'Now' });

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(component.form.value).toEqual({
      description: '',
      severity: 'medium',
      dueAt: null,
      notes: '',
    });
  });

  it('should keep the entry when the submission completes with an error', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue(values: Record<string, unknown>): void;
        value: { description: string };
      };
    };
    component.form.patchValue({ description: 'Blocked exit' });

    fixture.componentRef.setInput('serverError', { status: 500 });
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(component.form.value.description).toBe('Blocked exit');
  });

  it('should disable the form while loading', () => {
    const fixture = TestBed.createComponent(NonConformityForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { form: { disabled: boolean } };
    expect(component.form.disabled).toBe(true);
  });
});
