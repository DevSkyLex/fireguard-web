import { TestBed } from '@angular/core/testing';
import { OrganizationSwitcherList } from './organization-switcher-list.component';
import type { OrganizationOutput } from '@core/models/organization';

const MOCK_ORG_1 = {
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

const MOCK_ORG_2 = {
  id: 'org-2',
  name: 'Beta Inc',
  slug: 'beta',
  isActive: true,
  status: 'active',
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as OrganizationOutput;

describe('OrganizationSwitcherList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrganizationSwitcherList],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the empty state when no organizations are provided', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No workspaces found');
  });

  it('should render a list item for each organization', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', [MOCK_ORG_1, MOCK_ORG_2]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('li button');
    expect(items.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    expect(fixture.nativeElement.textContent).toContain('Beta Inc');
  });

  it('should show a checkmark on the selected organization', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', [MOCK_ORG_1, MOCK_ORG_2]);
    fixture.componentRef.setInput('selectedOrganization', MOCK_ORG_1);
    fixture.detectChanges();

    const checkmarks = fixture.nativeElement.querySelectorAll('.pi-check');
    expect(checkmarks.length).toBe(1);
  });

  it('should not show any checkmark when no organization is selected', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', [MOCK_ORG_1, MOCK_ORG_2]);
    fixture.componentRef.setInput('selectedOrganization', null);
    fixture.detectChanges();

    const checkmarks = fixture.nativeElement.querySelectorAll('.pi-check');
    expect(checkmarks.length).toBe(0);
  });

  it('should emit organizationChange with the correct org when a row is clicked', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', [MOCK_ORG_1, MOCK_ORG_2]);
    fixture.detectChanges();

    const emitSpy = vi.fn();
    fixture.componentInstance.organizationChange.subscribe(emitSpy);

    const buttons = fixture.nativeElement.querySelectorAll('li button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(MOCK_ORG_2);
  });

  it('should highlight the selected organization row with bold font', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcherList);
    fixture.componentRef.setInput('organizations', [MOCK_ORG_1, MOCK_ORG_2]);
    fixture.componentRef.setInput('selectedOrganization', MOCK_ORG_2);
    fixture.detectChanges();

    const spans = fixture.nativeElement.querySelectorAll('li button span.truncate') as NodeListOf<HTMLSpanElement>;
    const boldSpan = Array.from(spans).find((s) => s.classList.contains('font-medium'));
    expect(boldSpan).toBeDefined();
    expect(boldSpan!.textContent!.trim()).toBe('Beta Inc');
  });
});
