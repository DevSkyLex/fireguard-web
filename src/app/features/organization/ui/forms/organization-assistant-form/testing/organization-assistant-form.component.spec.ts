import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationAssistantSettings } from '@features/organization/models';
import type { OrganizationAssistantFormValues } from '../models';
import { OrganizationAssistantForm } from '../organization-assistant-form.component';

function assistant(
  overrides: Partial<OrganizationAssistantSettings> = {},
): OrganizationAssistantSettings {
  return {
    enabled: false,
    model: null,
    temperature: 0.2,
    includeBusinessContext: true,
    ...overrides,
  };
}

describe('OrganizationAssistantForm', () => {
  let fixture: ComponentFixture<OrganizationAssistantForm>;
  let submissions: OrganizationAssistantFormValues[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="org-assistant-submit"]') as HTMLButtonElement;
  const temperatureInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-assistant-temperature"]') as HTMLInputElement;
  const modelText = (): HTMLElement =>
    root().querySelector('[data-testid="org-assistant-model"]') as HTMLElement;

  const typeTemperature = async (value: string): Promise<void> => {
    temperatureInput().value = value;
    temperatureInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationAssistantForm);
    fixture.componentRef.setInput('assistant', assistant());
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should show a stated default in place of a picker when there is no model override', async () => {
    expect(modelText().textContent).toContain('Using the operator default');
  });

  it('should render the model override as read-only text when one is set', async () => {
    fixture.componentRef.setInput('assistant', assistant({ model: 'llama3' }));
    await fixture.whenStable();

    expect(modelText().textContent).toContain('llama3');
    expect(root().querySelector('select, [role="listbox"], [role="combobox"]')).toBeNull();
  });

  it('should keep the submit control disabled until the tree changes', async () => {
    expect(submitButton().disabled).toBe(true);

    await typeTemperature('0.8');

    expect(submitButton().disabled).toBe(false);
  });

  it('should emit the edited values, excluding the read-only model', async () => {
    await typeTemperature('0.8');
    await submit();

    expect(submissions).toEqual([
      { enabled: false, temperature: 0.8, includeBusinessContext: true },
    ]);
  });

  it('should reject a temperature outside the 0-2 range and not submit', async () => {
    await typeTemperature('5');
    await submit();

    expect(submissions).toEqual([]);
    expect(
      root().querySelector('[data-testid="org-assistant-temperature"]')?.parentElement?.textContent,
    ).toContain('2');
  });
});
