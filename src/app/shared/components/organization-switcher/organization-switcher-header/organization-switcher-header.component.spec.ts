import { TestBed } from '@angular/core/testing';
import { OrganizationSwitcherHeader } from './organization-switcher-header.component';

describe('OrganizationSwitcherHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationSwitcherHeader],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the section title', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherHeader);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Organizations');
  });

  it('should display the count badge when organizationCount is greater than 0', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherHeader);
    fixture.componentRef.setInput('organizationCount', 3);
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('span.inline-flex');
    expect(badge).not.toBeNull();
    expect(badge!.textContent!.trim()).toBe('3');
  });

  it('should not display the count badge when organizationCount is 0', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherHeader);
    fixture.componentRef.setInput('organizationCount', 0);
    fixture.detectChanges();

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('span.inline-flex');
    expect(badge).toBeNull();
  });
});
