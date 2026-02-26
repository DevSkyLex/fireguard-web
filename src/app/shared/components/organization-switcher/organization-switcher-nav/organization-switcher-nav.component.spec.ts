import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationSwitcherNav } from './organization-switcher-nav.component';
import type { OrganizationOutput } from '@core/models/organization';

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

describe('OrganizationSwitcherNav', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationSwitcherNav],
      providers: [provideRouter([])],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nothing when organization is null', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('should display the organization name', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should display the "Current organization" label', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Current organization');
  });

  it('should render Members, Settings, and Billing navigation links', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(3);

    const labels = Array.from(links).map((a) => a.textContent!.trim());
    expect(labels).toContain('Members');
    expect(labels).toContain('Settings');
    expect(labels).toContain('Billing');
  });

  it('should include the organization id in navigation link hrefs', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
    Array.from(links).forEach((link) => {
      expect(link.getAttribute('href')).toContain('org-1');
    });
  });

  it('should emit navigate when a management link is clicked', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    const emitSpy = vi.fn();
    fixture.componentInstance.navigate.subscribe(emitSpy);

    const links = fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
    links[0].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit navigate once per link click for all three links', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherNav);
    fixture.componentRef.setInput('organization', MOCK_ORG);
    fixture.detectChanges();

    const emitSpy = vi.fn();
    fixture.componentInstance.navigate.subscribe(emitSpy);

    const links = fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
    links[0].click();
    links[1].click();
    links[2].click();

    expect(emitSpy).toHaveBeenCalledTimes(3);
  });
});
