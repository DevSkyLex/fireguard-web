import { TestBed } from '@angular/core/testing';
import { CalendarEventForm } from '../calendar-event-form.component';

type CalendarEventFormTestApi = CalendarEventForm & {
  form: {
    controls: {
      title: { setValue(value: string): void; value: string };
      description: { setValue(value: string): void };
      startsAt: { setValue(value: Date | null): void };
      endsAt: { setValue(value: Date | null): void };
      allDay: { setValue(value: boolean): void };
    };
    hasError(error: string): boolean;
  };
  submit(): void;
};

describe('CalendarEventForm', () => {
  let component: CalendarEventFormTestApi;

  const starts = new Date('2026-08-01T09:00:00Z');
  const ends = new Date('2026-08-01T11:00:00Z');

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new CalendarEventForm() as unknown as CalendarEventFormTestApi,
    );
  });

  it('emits the submitted values when the form is valid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.title.setValue('Fire drill');
    component.form.controls.startsAt.setValue(starts);
    component.form.controls.endsAt.setValue(ends);
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({
      title: 'Fire drill',
      description: '',
      startsAt: starts,
      endsAt: ends,
      allDay: false,
    });
  });

  it('does not emit when the title is missing', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.startsAt.setValue(starts);
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not emit when the start is missing', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.title.setValue('Fire drill');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('flags an end that is before the start and does not emit', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.title.setValue('Fire drill');
    component.form.controls.startsAt.setValue(ends);
    component.form.controls.endsAt.setValue(starts);
    component.submit();

    expect(component.form.hasError('endsBeforeStarts')).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('resets the title after a successful submit', () => {
    component.form.controls.title.setValue('Fire drill');
    component.form.controls.startsAt.setValue(starts);
    component.submit();

    expect(component.form.controls.title.value).toBe('');
  });
});
