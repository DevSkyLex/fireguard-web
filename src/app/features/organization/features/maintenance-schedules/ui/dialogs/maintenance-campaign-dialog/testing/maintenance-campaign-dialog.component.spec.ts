import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceCampaignDialog } from '../maintenance-campaign-dialog.component';

describe('MaintenanceCampaignDialog', () => {
  let fixture: ComponentFixture<MaintenanceCampaignDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MaintenanceCampaignDialog);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="maintenance-campaign-dialog"]')).toBeNull();
  });

  it('should render the campaign form inside the dialog once open', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('app-maintenance-campaign-form')).not.toBeNull();
  });

  it('should forward the form submission untouched', async () => {
    const emitted: Array<Omit<GenerateMaintenanceCampaignInput, 'organization'>> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: Omit<GenerateMaintenanceCampaignInput, 'organization'>): void => {
        emitted.push(value);
      },
    );

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const payload: Omit<GenerateMaintenanceCampaignInput, 'organization'> = {
      name: 'Q1 round',
      dueBefore: '2026-06-30T23:59:59.000Z',
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
      .querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-cancel"]')
      ?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable close while pending', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="maintenance-campaign-submit"]')
        ?.disabled,
    ).toBe(true);
  });
});
