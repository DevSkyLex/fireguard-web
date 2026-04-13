import { TestBed } from '@angular/core/testing';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationSwitcherTrigger } from './organization-switcher-trigger.component';

const MOCK_ORG = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  status: 'active',
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as OrganizationOutput;

describe('OrganizationSwitcherTrigger', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationSwitcherTrigger],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a skeleton when isLoading is true', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the button when isLoading is false', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-button')).not.toBeNull();
  });

  it('should display the organization name when an org is provided', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should display "Select workspace" when no organization is provided', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Select workspace');
  });

  it('should emit toggleMenu when the button is clicked', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    const emitSpy = vi.fn();
    fixture.componentInstance.toggleMenu.subscribe(emitSpy);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should disable the button when isSwitching is true', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.componentRef.setInput('isSwitching', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should show a spinner icon when isSwitching is true', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.componentRef.setInput('isSwitching', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-spinner')).not.toBeNull();
  });

  it('should show the chevron icon when isSwitching is false', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherTrigger);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.componentRef.setInput('isSwitching', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-chevron-down')).not.toBeNull();
  });
});
