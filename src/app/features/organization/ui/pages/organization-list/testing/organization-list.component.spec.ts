import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationListPage } from '../organization-list.component';

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
    selectedOrganization: signal<OrganizationOutput | null>(null),
    isLoadingOrganizations: signal(false),
    isLoadingOrganization: signal(false),
    isEmpty: signal(true),
    isDeleting: signal(false),
    isCreating: signal(false),
    totalOrganizations: signal(0),
    lastLazyEvent: signal(null),
    loadOrganizations: vi.fn(),
    load: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    setLastLazyEvent: vi.fn(),
    resetCreateOperation: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.selectedOrganization.set(null);
    mockOrganizationStore.isLoadingOrganizations.set(false);
    mockOrganizationStore.isLoadingOrganization.set(false);
    mockOrganizationStore.isEmpty.set(true);
    mockOrganizationStore.isDeleting.set(false);
    mockOrganizationStore.totalOrganizations.set(0);
    mockOrganizationStore.loadOrganizations.mockReset();
    mockOrganizationStore.load.mockReset();
    mockOrganizationStore.deleteOne.mockReset();
    mockOrganizationStore.deleteMany.mockReset();
    mockOrganizationStore.setLastLazyEvent.mockReset();

    TestBed.configureTestingModule({
      imports: [OrganizationListPage],
      providers: [provideRouter([])],
    }).overrideComponent(OrganizationListPage, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockOrganizationStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display organization items when organizations are loaded', () => {
    mockOrganizationStore.organizations.set([
      MOCK_ORG,
      { ...MOCK_ORG, id: 'org-2', name: 'Beta Inc', slug: 'beta' } as OrganizationOutput,
    ]);
    mockOrganizationStore.isEmpty.set(false);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    expect(fixture.nativeElement.textContent).toContain('Beta Inc');
  });

  it('should show empty state when there are no organizations', () => {
    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.isLoadingOrganizations.set(false);
    mockOrganizationStore.isEmpty.set(true);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No organizations found');
  });

  it('should show skeletons when loading', () => {
    mockOrganizationStore.isLoadingOrganizations.set(true);
    mockOrganizationStore.isEmpty.set(false);
    const fixture = TestBed.createComponent(OrganizationListPage);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
