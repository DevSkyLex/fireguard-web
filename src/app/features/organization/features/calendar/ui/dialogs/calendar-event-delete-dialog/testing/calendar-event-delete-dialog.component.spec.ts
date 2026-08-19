import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CalendarEventDeleteDialog } from '../calendar-event-delete-dialog.component';

describe('CalendarEventDeleteDialog', () => {
  let fixture: ComponentFixture<CalendarEventDeleteDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CalendarEventDeleteDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should emit confirmed when the confirm action is activated', () => {
    const confirmed: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      confirmed.push(undefined);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-event-delete-confirm"]')
      ?.click();

    expect(confirmed.length).toBe(1);
  });

  it('should not emit confirmed while a delete write is already pending', () => {
    fixture.componentRef.setInput('pending', true);

    const confirmed: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      confirmed.push(undefined);
    });

    (fixture.componentInstance as unknown as { confirm(): void }).confirm();

    expect(confirmed.length).toBe(0);
  });

  it('should render the last rejection inline', async () => {
    fixture.componentRef.setInput('errorMessage', 'The event could not be deleted.');
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="calendar-event-delete-error"]')?.textContent,
    ).toContain('The event could not be deleted.');
  });

  it('should emit visibleChange false on dismissal', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    (
      fixture.componentInstance as unknown as {
        onStateChanged(state: 'open' | 'closed'): void;
      }
    ).onStateChanged('closed');

    expect(changes).toEqual([false]);
  });
});
