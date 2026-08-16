import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityDeleteDialog } from '../facility-delete-dialog.component';

describe('FacilityDeleteDialog', () => {
  let fixture: ComponentFixture<FacilityDeleteDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityDeleteDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should emit confirmed when the confirm action is activated', () => {
    const confirmed: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      confirmed.push(undefined);
    });

    document.querySelector<HTMLButtonElement>('[data-testid="facility-delete-confirm"]')?.click();

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
