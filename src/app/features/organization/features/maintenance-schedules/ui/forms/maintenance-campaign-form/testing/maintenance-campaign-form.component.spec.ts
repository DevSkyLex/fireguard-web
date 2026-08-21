import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceCampaignForm } from '../maintenance-campaign-form.component';

const setValue = (testId: string, value: string): void => {
  const input: HTMLInputElement = document.querySelector<HTMLInputElement>(
    `[data-testid="${testId}"]`,
  ) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('MaintenanceCampaignForm', () => {
  let fixture: ComponentFixture<MaintenanceCampaignForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MaintenanceCampaignForm);
    await fixture.whenStable();
  });

  it('should not submit and should show field errors when required fields are empty', async () => {
    const submitted: Array<Omit<GenerateMaintenanceCampaignInput, 'organization'>> = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Name is required.');
  });

  it('should emit submitted with the trimmed name and an ISO dueBefore when valid', async () => {
    const submitted: Array<Omit<GenerateMaintenanceCampaignInput, 'organization'>> = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    setValue('maintenance-campaign-name', '  Q1 round  ');
    setValue('maintenance-campaign-due-before', '2026-06-30');
    await fixture.whenStable();

    document.querySelector<HTMLFormElement>('form')?.requestSubmit();
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

  it('should emit cancelled when the operator backs out', () => {
    const emitted: void[] = [];
    fixture.componentInstance.cancelled.subscribe((): void => {
      emitted.push(undefined);
    });

    document
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-cancel"]')
      ?.click();

    expect(emitted.length).toBe(1);
  });

  it('should disable the footer controls while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
