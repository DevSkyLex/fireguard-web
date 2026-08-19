import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MaintenanceScheduleOutput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceOverrideDialog } from '../maintenance-override-dialog.component';

const schedule: MaintenanceScheduleOutput = {
  '@id': '/api/maintenance/schedules/schedule-1',
  '@type': 'MaintenanceSchedule',
  id: 'schedule-1',
  organization: '/api/organizations/org-1',
  equipment: '/api/equipment/equipment-1',
  equipmentType: 'fire_extinguisher',
  dueStatus: 'due_soon',
  intervalOverride: 'P3M',
  createdAt: '2026-01-01T00:00:00+00:00',
  updatedAt: '2026-01-01T00:00:00+00:00',
};

describe('MaintenanceOverrideDialog', () => {
  let fixture: ComponentFixture<MaintenanceOverrideDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MaintenanceOverrideDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('schedule', schedule);
    await fixture.whenStable();
  });

  it('should seed the draft from the schedule current override', () => {
    const value: string | null = (
      document.querySelector('[data-testid="maintenance-override-select"]') as HTMLElement
    ).textContent;

    expect(value).toContain('Every 3 months');
  });

  it('should emit submitted with the chosen duration', () => {
    const submitted: Array<string | null> = [];
    fixture.componentInstance.submitted.subscribe((value: string | null): void => {
      submitted.push(value);
    });

    (fixture.componentInstance as unknown as { draft: { set(value: string): void } }).draft.set(
      'P1Y',
    );
    document
      .querySelector<HTMLFormElement>('[data-testid="maintenance-override-dialog"] form')
      ?.requestSubmit();

    expect(submitted).toEqual(['P1Y']);
  });

  it('should emit submitted with null when the organization-default choice is selected', () => {
    const submitted: Array<string | null> = [];
    fixture.componentInstance.submitted.subscribe((value: string | null): void => {
      submitted.push(value);
    });

    (fixture.componentInstance as unknown as { draft: { set(value: string): void } }).draft.set(
      '__organization_default__',
    );
    document
      .querySelector<HTMLFormElement>('[data-testid="maintenance-override-dialog"] form')
      ?.requestSubmit();

    expect(submitted).toEqual([null]);
  });

  it('should emit visibleChange false when Cancel is activated', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-override-cancel"]')
      ?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable the submit action while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-override-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
