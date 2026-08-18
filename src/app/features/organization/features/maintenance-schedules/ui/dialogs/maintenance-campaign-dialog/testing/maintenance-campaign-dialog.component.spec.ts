import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceCampaignDialog } from '../maintenance-campaign-dialog.component';

const setValue = (testId: string, value: string): void => {
  const input: HTMLInputElement = document.querySelector<HTMLInputElement>(
    `[data-testid="${testId}"]`,
  ) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('MaintenanceCampaignDialog', () => {
  let fixture: ComponentFixture<MaintenanceCampaignDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MaintenanceCampaignDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should not submit and should show field errors when required fields are empty', async () => {
    const submitted: Array<Omit<GenerateMaintenanceCampaignInput, 'organization'>> = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    document
      .querySelector<HTMLFormElement>('[data-testid="maintenance-campaign-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(
      document.querySelector('[data-testid="maintenance-campaign-dialog"]')?.textContent,
    ).toContain('Name is required.');
  });

  it('should emit submitted with the trimmed name and an ISO dueBefore when valid', async () => {
    const submitted: Array<Omit<GenerateMaintenanceCampaignInput, 'organization'>> = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    setValue('maintenance-campaign-name', '  Q1 round  ');
    setValue('maintenance-campaign-due-before', '2026-06-30');
    await fixture.whenStable();

    document
      .querySelector<HTMLFormElement>('[data-testid="maintenance-campaign-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(1);
    expect(submitted[0].name).toBe('Q1 round');
    expect(submitted[0].facility).toBeUndefined();
    expect(submitted[0].equipmentType).toBeUndefined();
    expect(new Date(submitted[0].dueBefore).getUTCFullYear()).toBe(2026);
  });

  it('should render the no-match 422 detail inline rather than a generic message', async () => {
    const error = {
      message: 'No due maintenance schedules match the given filters.',
    } as StoreError;
    fixture.componentRef.setInput('serverError', error);
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="maintenance-campaign-error"]')?.textContent,
    ).toContain('No due maintenance schedules match the given filters.');
  });

  it('should emit visibleChange false when Cancel is activated', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-cancel"]')
      ?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable close while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
