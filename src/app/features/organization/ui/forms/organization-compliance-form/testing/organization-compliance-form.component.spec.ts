import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationComplianceSettings } from '@features/organization/models';
import type { OrganizationComplianceFormValues } from '../models';
import { OrganizationComplianceForm } from '../organization-compliance-form.component';

function compliance(
  overrides: Partial<OrganizationComplianceSettings> = {},
): OrganizationComplianceSettings {
  return {
    nonConformitySlaDays: { low: 90, medium: 30, high: 7, critical: 1 },
    inspectionPeriodicityDefaults: { fire_extinguisher: 'P1Y', camera: 'P1Y' },
    reminderWindowDays: 30,
    customizedSlaSeverities: [],
    customizedPeriodicityTypes: [],
    ...overrides,
  };
}

describe('OrganizationComplianceForm', () => {
  let fixture: ComponentFixture<OrganizationComplianceForm>;
  let submissions: OrganizationComplianceFormValues[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="org-compliance-submit"]') as HTMLButtonElement;
  const reminderInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-compliance-reminder-window"]') as HTMLInputElement;

  const typeReminder = async (value: string): Promise<void> => {
    reminderInput().value = value;
    reminderInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationComplianceForm);
    fixture.componentRef.setInput('compliance', compliance());
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should render one SLA row per severity the seed carries', async () => {
    expect(root().textContent).toContain('Low');
    expect(root().textContent).toContain('Medium');
    expect(root().textContent).toContain('High');
    expect(root().textContent).toContain('Critical');
    expect(root().querySelector('[data-testid="org-compliance-sla-critical"]')).not.toBeNull();
  });

  it('should render one periodicity row per equipment type the seed carries', async () => {
    expect(root().textContent).toContain('Fire extinguisher');
    expect(root().textContent).toContain('Camera');
    expect(
      root().querySelector('[data-testid="org-compliance-periodicity-camera"]'),
    ).not.toBeNull();
  });

  it('should mark only the severities and types the seed names as customized', async () => {
    fixture.componentRef.setInput(
      'compliance',
      compliance({ customizedSlaSeverities: ['critical'], customizedPeriodicityTypes: ['camera'] }),
    );
    await fixture.whenStable();

    const criticalRow: HTMLElement = root()
      .querySelector('[data-testid="org-compliance-sla-critical"]')
      ?.closest('hlm-field') as HTMLElement;
    const lowRow: HTMLElement = root()
      .querySelector('[data-testid="org-compliance-sla-low"]')
      ?.closest('hlm-field') as HTMLElement;

    expect(criticalRow.textContent).toContain('Customized');
    expect(lowRow.textContent).not.toContain('Customized');
  });

  it('should keep the submit control disabled until the tree changes', async () => {
    expect(submitButton().disabled).toBe(true);

    await typeReminder('45');

    expect(submitButton().disabled).toBe(false);
  });

  it('should emit the edited values once submitted', async () => {
    await typeReminder('45');
    await submit();

    expect(submissions).toEqual([
      {
        nonConformitySlaDays: { low: 90, medium: 30, high: 7, critical: 1 },
        inspectionPeriodicityDefaults: { fire_extinguisher: 'P1Y', camera: 'P1Y' },
        reminderWindowDays: 45,
      },
    ]);
  });

  it('should reject a reminder window outside the 1-180 day range and not submit', async () => {
    await typeReminder('365');
    await submit();

    expect(submissions).toEqual([]);
    expect(
      root().querySelector('[data-testid="org-compliance-reminder-window"]')?.parentElement
        ?.textContent,
    ).toContain('180');
  });

  it('should lock the submit control and swap its label while a save is in flight', async () => {
    await typeReminder('45');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Saving…');
  });
});
