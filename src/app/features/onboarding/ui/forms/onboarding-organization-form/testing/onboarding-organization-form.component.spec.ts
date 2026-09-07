import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SetupCreateOrganizationInput } from '@features/organization/setup';
import { OnboardingOrganizationForm } from '../onboarding-organization-form.component';

describe('OnboardingOrganizationForm', () => {
  let fixture: ComponentFixture<OnboardingOrganizationForm>;
  let element: HTMLElement;

  const fill = async (testId: string, value: string): Promise<void> => {
    const input: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingOrganizationForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should refuse to emit while the name is blank, and show the reason', async () => {
    const emitted: SetupCreateOrganizationInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateOrganizationInput): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain("Enter your organization's name.");
  });

  it('should emit the trimmed name and leave slug generation to the server', async () => {
    const emitted: SetupCreateOrganizationInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: SetupCreateOrganizationInput): void => {
      emitted.push(value);
    });

    await fill('onboarding-org-name', ' Acme Fire Safety ');
    await submit();

    expect(emitted).toEqual([{ name: 'Acme Fire Safety' }]);
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="onboarding-org-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Creating…');
  });
});
