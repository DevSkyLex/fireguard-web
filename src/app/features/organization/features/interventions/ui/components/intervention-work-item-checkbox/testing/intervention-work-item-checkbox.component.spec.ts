import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionWorkItemStatusChange } from '@features/organization/features/interventions/models';
import { InterventionWorkItemCheckbox } from '../intervention-work-item-checkbox.component';

describe('InterventionWorkItemCheckbox', () => {
  let fixture: ComponentFixture<InterventionWorkItemCheckbox>;
  let changes: InterventionWorkItemStatusChange[];

  const checkbox = (): HTMLButtonElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[role="checkbox"]');

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionWorkItemCheckbox);
    fixture.componentRef.setInput('workItemId', 'wi-1');
    fixture.componentRef.setInput('controlId', 'wi-1-table');
    fixture.componentRef.setInput('status', 'planned');
    fixture.componentRef.setInput('ariaLabel', 'Complete Inspection');
    await fixture.whenStable();

    changes = [];
    fixture.componentInstance.statusChanged.subscribe((change) => changes.push(change));
  });

  it('should expose a real checkbox and request completion when checked', () => {
    expect(checkbox()?.getAttribute('aria-checked')).toBe('false');

    checkbox()?.click();

    expect(changes).toEqual([{ workItemId: 'wi-1', status: 'completed' }]);
  });

  it('should request planned when completed work is unchecked', async () => {
    fixture.componentRef.setInput('status', 'completed');
    await fixture.whenStable();

    expect(checkbox()?.getAttribute('aria-checked')).toBe('true');
    checkbox()?.click();

    expect(changes).toEqual([{ workItemId: 'wi-1', status: 'planned' }]);
  });

  it('should disable skipped work and keep its workflow distinct from completion', async () => {
    fixture.componentRef.setInput('status', 'skipped');
    await fixture.whenStable();

    expect(checkbox()?.disabled).toBe(true);
    checkbox()?.click();
    expect(changes).toEqual([]);
  });

  it('should keep the control busy and non-interactive while its status is saving', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(checkbox()?.disabled).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="intervention-work-item-checkbox-pending"]',
      ),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[aria-busy="true"]'),
    ).not.toBeNull();
  });
});
