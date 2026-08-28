import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { CalendarEventForm } from '../calendar-event-form.component';
import type { CalendarEventDraft, CalendarEventFormValues } from '../models';

const setValue = (testId: string, value: string): void => {
  const input: HTMLInputElement | HTMLTextAreaElement = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[data-testid="${testId}"]`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

/**
 * Sets the draft's date fields directly on the component's private model
 * signal — `hlm-date-picker`'s trigger opens a popover calendar that a jsdom
 * unit spec cannot practically click through, so this reaches the same value
 * `writeValue`/`updateDate` would, exactly the way `calendar-page`'s own spec
 * reaches protected members through a narrow cast.
 */
const setDraftDates = (
  fixture: ComponentFixture<CalendarEventForm>,
  patch: Partial<Pick<CalendarEventDraft, 'startsAtDate' | 'endsAtDate'>>,
): void => {
  (
    fixture.componentInstance as unknown as { model: WritableSignal<CalendarEventDraft> }
  ).model.update((draft) => ({ ...draft, ...patch }));
};

const EVENT: CalendarFeedItemOutput = {
  sourceKey: 'calendar_event',
  id: 'event-1',
  title: 'Fire drill',
  description: 'Annual drill',
  startsAt: '2026-08-01T09:00:00+02:00',
  endsAt: '2026-08-01T11:00:00+02:00',
  allDay: false,
  facilityId: null,
  status: null,
  targetType: 'calendar_event',
  targetId: 'event-1',
};

describe('CalendarEventForm', () => {
  let fixture: ComponentFixture<CalendarEventForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CalendarEventForm);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should not submit and should show field errors when required fields are empty', async () => {
    const submitted: CalendarEventFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('A start date is required.');
  });

  it('should emit submitted with the trimmed title and ISO instants when valid', async () => {
    const submitted: CalendarEventFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    setValue('calendar-event-title', '  Fire drill  ');
    setDraftDates(fixture, { startsAtDate: new Date(2026, 7, 1) });
    setValue('calendar-event-starts-at-time', '09:00');
    await fixture.whenStable();

    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(1);
    expect(submitted[0].title).toBe('Fire drill');
    expect(submitted[0].description).toBeNull();
    expect(submitted[0].facilityId).toBeNull();
    expect(new Date(submitted[0].startsAt).getUTCFullYear()).toBe(2026);
  });

  it('should reject an end before the start', async () => {
    setValue('calendar-event-title', 'Fire drill');
    setDraftDates(fixture, {
      startsAtDate: new Date(2026, 7, 1),
      endsAtDate: new Date(2026, 7, 1),
    });
    setValue('calendar-event-starts-at-time', '11:00');
    setValue('calendar-event-ends-at-time', '09:00');
    await fixture.whenStable();

    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('The end must not be before the start.');
  });

  it('should seed the draft from the record being edited', async () => {
    fixture.componentRef.setInput('editing', EVENT);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-event-title"]')?.value,
    ).toBe('Fire drill');
    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-event-starts-at-time"]')
        ?.value,
    ).not.toBe('');
    expect(fixture.nativeElement.textContent).toContain('Save changes');
  });

  it('should render the last write error inline', async () => {
    const error = { message: 'The event could not be saved.' } as StoreError;
    fixture.componentRef.setInput('serverError', error);
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="calendar-event-dialog-error"]')?.textContent,
    ).toContain('The event could not be saved.');
  });

  it('should emit cancelled when the operator backs out', () => {
    const emitted: void[] = [];
    fixture.componentInstance.cancelled.subscribe((): void => {
      emitted.push(undefined);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-cancel"]')
      ?.click();

    expect(emitted.length).toBe(1);
  });

  it('should disable the footer controls while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-submit"]')
        ?.disabled,
    ).toBe(true);
  });

  it('should clear the draft once the hosting overlay closes', async () => {
    setValue('calendar-event-title', 'Should be discarded');
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-event-title"]')?.value,
    ).toBe('');
  });
});
