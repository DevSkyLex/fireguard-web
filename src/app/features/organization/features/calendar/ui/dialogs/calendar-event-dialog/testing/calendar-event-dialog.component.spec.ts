import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CalendarEventFormValues } from '../../../forms/calendar-event-form';
import { CalendarEventDialog } from '../calendar-event-dialog.component';

describe('CalendarEventDialog', () => {
  let fixture: ComponentFixture<CalendarEventDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CalendarEventDialog);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-event-dialog"]')).toBeNull();
  });

  it('should render the event form inside the dialog once open', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('app-calendar-event-form')).not.toBeNull();
  });

  it('should show the edit title only when editing a record', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'New event',
    );

    fixture.componentRef.setInput('editing', {
      sourceKey: 'calendar_event',
      id: 'event-1',
      title: 'Fire drill',
      description: null,
      startsAt: '2026-08-01T09:00:00+02:00',
      endsAt: null,
      allDay: false,
      facilityId: null,
      status: null,
      targetType: 'calendar_event',
      targetId: 'event-1',
    });
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-event-dialog"]')?.textContent).toContain(
      'Edit event',
    );
  });

  it('should forward the form submission untouched', async () => {
    const emitted: CalendarEventFormValues[] = [];
    fixture.componentInstance.submitted.subscribe((value: CalendarEventFormValues): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const payload: CalendarEventFormValues = {
      title: 'Fire drill',
      description: null,
      startsAt: '2026-08-01T09:00:00.000Z',
      endsAt: null,
      allDay: false,
      facilityId: null,
    };
    fixture.componentInstance.submitted.emit(payload);

    expect(emitted).toEqual([payload]);
  });

  it('should emit visibleChange false when the form cancels', async () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-cancel"]')
      ?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable close while pending', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="calendar-event-dialog-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
