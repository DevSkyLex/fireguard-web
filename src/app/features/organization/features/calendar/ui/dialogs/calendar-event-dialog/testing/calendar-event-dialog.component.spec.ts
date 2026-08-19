import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { CalendarEventDialog } from '../calendar-event-dialog.component';
import type { CalendarEventFormValues } from '../models';

const setValue = (testId: string, value: string): void => {
  const input: HTMLInputElement | HTMLTextAreaElement = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[data-testid="${testId}"]`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
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

describe('CalendarEventDialog', () => {
  let fixture: ComponentFixture<CalendarEventDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CalendarEventDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should not submit and should show field errors when required fields are empty', async () => {
    const submitted: CalendarEventFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    document
      .querySelector<HTMLFormElement>('[data-testid="calendar-event-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'A title is required.',
    );
  });

  it('should emit submitted with the trimmed title and ISO instants when valid', async () => {
    const submitted: CalendarEventFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    setValue('calendar-event-title', '  Fire drill  ');
    setValue('calendar-event-starts-at', '2026-08-01T09:00');
    await fixture.whenStable();

    document
      .querySelector<HTMLFormElement>('[data-testid="calendar-event-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(1);
    expect(submitted[0].title).toBe('Fire drill');
    expect(submitted[0].description).toBeNull();
    expect(submitted[0].facilityId).toBeNull();
    expect(new Date(submitted[0].startsAt).getUTCFullYear()).toBe(2026);
  });

  it('should reject an end before the start', async () => {
    setValue('calendar-event-title', 'Fire drill');
    setValue('calendar-event-starts-at', '2026-08-01T11:00');
    setValue('calendar-event-ends-at', '2026-08-01T09:00');
    await fixture.whenStable();

    document
      .querySelector<HTMLFormElement>('[data-testid="calendar-event-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'The end must not be before the start.',
    );
  });

  it('should seed the draft from the record being edited', async () => {
    fixture.componentRef.setInput('editing', EVENT);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-event-title"]')?.value,
    ).toBe('Fire drill');
    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'Save changes',
    );
  });

  it('should render the last write error inline', async () => {
    const error = { message: 'The event could not be saved.' } as StoreError;
    fixture.componentRef.setInput('serverError', error);
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="calendar-event-dialog-error"]')?.textContent,
    ).toContain('The event could not be saved.');
  });

  it('should emit visibleChange false when Cancel is activated', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-cancel"]')
      ?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable close while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
