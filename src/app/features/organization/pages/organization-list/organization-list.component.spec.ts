import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { OrganizationStore } from '@core/stores/organization';
import type { OrganizationOutput } from '@core/models/organization';
import { OrganizationListPage } from './organization-list.component';

const MOCK_ORG: OrganizationOutput = {
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

describe('OrganizationListPage', () => {
  const mockOrganizationStore = {
    organizations: signal<OrganizationOutput[]>([]),
    isLoadingOrganizations: signal(false),
    loadOrganizations: vi.fn(),
  };

  beforeEach(() => {
    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.isLoadingOrganizations.set(false);
    mockOrganizationStore.loadOrganizations.mockReset();

    TestBed.configureTestingModule({
      imports: [OrganizationListPage],
      providers: [
        provideRouter([]),
        { provide: OrganizationStore, useValue: mockOrganizationStore },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load organizations on init when list is empty', () => {
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).toHaveBeenCalledTimes(1);
  });

  it('should not load organizations on init when already loaded', () => {
    mockOrganizationStore.organizations.set([MOCK_ORG]);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should display organization rows when organizations are loaded', () => {
    mockOrganizationStore.organizations.set([MOCK_ORG, { ...MOCK_ORG, id: 'org-2', name: 'Beta Inc', slug: 'beta' } as OrganizationOutput]);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    expect(fixture.nativeElement.textContent).toContain('Beta Inc');
  });

  it('should show empty state when there are no organizations', () => {
    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.isLoadingOrganizations.set(false);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("You don't belong to any organization yet.");
  });

  it('should show skeletons when loading', () => {
    mockOrganizationStore.isLoadingOrganizations.set(true);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
