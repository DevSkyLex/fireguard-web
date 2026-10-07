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

    expect(submitted).toHaveLength(0);
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

    expect(submitted).toHaveLength(1);
    expect(submitted[0].name).toBe('Q1 round');
    expect(submitted[0].facility).toBeUndefined();
    expect(submitted[0].equipmentType).toBeUndefined();
    expect(new Date(submitted[0].dueBefore).getUTCFullYear()).toBe(2026);
  });
  it('uses and submits a server-defined custom equipment type without a closed enum', async () => {
    fixture.componentRef.setInput('equipmentTypeOptions', [
      {
        '@id': '/api/types/custom_fire_panel',
        '@type': 'EquipmentType',
        value: 'custom_fire_panel',
        label: 'North hall fire panel',
        family: 'fire',
        archived: false,
        revision: 1,
        icon: 'lucideBox',
      },
    ]);
    fixture.componentInstance['model'].update((draft) => ({
      ...draft,
      name: 'Custom panel control',
      dueBefore: '2027-01-31',
      equipmentType: 'custom_fire_panel',
    }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('North hall fire panel');
    const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentType: 'custom_fire_panel' }),
    );
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

    expect(emitted).toHaveLength(1);
  });

  it('disables the fields and footer while pending and restores the draft when pending clears', async () => {
    setValue('maintenance-campaign-name', 'Monthly sweep');
    setValue('maintenance-campaign-due-before', '2026-10-31');
    await fixture.whenStable();
    const fields = fixture.componentInstance['campaignForm'];
    expect(fields.name().disabled()).toBe(false);
    expect(fields.dueBefore().disabled()).toBe(false);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    for (const field of [fields.name, fields.dueBefore]) {
      expect(field().disabled()).toBe(true);
      expect(field().disabledReasons()).toEqual([{ fieldTree: fields }]);
    }
    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-submit"]')
        ?.disabled,
    ).toBe(true);

    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    for (const field of [fields.name, fields.dueBefore]) {
      expect(field().disabled()).toBe(false);
      expect(field().disabledReasons()).toEqual([]);
    }
    expect(fields.name().value()).toBe('Monthly sweep');
    expect(fields.dueBefore().value()).toBe('2026-10-31');
    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-submit"]')
        ?.disabled,
    ).toBe(false);
  });
});
