import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationAutomationSettings } from '@features/organization/models';
import { OrganizationAutomationForm } from '../organization-automation-form.component';

describe('OrganizationAutomationForm', () => {
  let fixture: ComponentFixture<OrganizationAutomationForm>;
  let submissions: OrganizationAutomationSettings[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const toggle = (): HTMLElement =>
    root().querySelector(
      '[data-testid="org-automation-auto-create-intervention"] [role="switch"]',
    ) as HTMLElement;

  const click = async (element: HTMLElement): Promise<void> => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationAutomationForm);
    fixture.componentRef.setInput('automation', { autoCreateInterventionOnCriticalNc: false });
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should render the switch unchecked from a seed of false', async () => {
    expect(toggle().getAttribute('data-state')).toBe('unchecked');
  });

  it('should render the switch checked from a seed of true', async () => {
    fixture.componentRef.setInput('automation', { autoCreateInterventionOnCriticalNc: true });
    await fixture.whenStable();

    expect(toggle().getAttribute('data-state')).toBe('checked');
  });

  it('should emit the full policy after the switch is toggled', async () => {
    await click(toggle());

    expect(submissions).toEqual([{ autoCreateInterventionOnCriticalNc: true }]);
  });

  it('should not emit while a save is already in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(toggle().getAttribute('data-disabled')).toBe('true');
  });
});
