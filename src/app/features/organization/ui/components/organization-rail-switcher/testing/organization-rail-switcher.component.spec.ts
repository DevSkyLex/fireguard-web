import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationRailSwitcher } from '../organization-rail-switcher.component';

const org = (id: string, name: string, logoUrl: string | null = null) => ({
  id,
  name,
  slug: name.toLowerCase(),
  status: 'active',
  isActive: true,
  logoUrl,
  ownerUserId: 'u1',
  createdByUserId: 'u1',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
});

describe('OrganizationRailSwitcher', () => {
  const organizations = signal([
    org('org-1', 'Acme'),
    org('org-2', 'Beta', 'https://cdn/logo.png'),
  ]);
  const selectedOrganization = signal<ReturnType<typeof org> | null>(org('org-1', 'Acme'));
  const loadOrganizations = vi.fn();
  const mockStore = {
    organizations,
    selectedOrganization,
    isLoadingOrganizations: signal(false),
    loadOrganizations,
  };

  beforeEach(() => {
    organizations.set([org('org-1', 'Acme'), org('org-2', 'Beta', 'https://cdn/logo.png')]);
    selectedOrganization.set(org('org-1', 'Acme'));
    loadOrganizations.mockReset();

    TestBed.configureTestingModule({
      imports: [OrganizationRailSwitcher],
      providers: [provideRouter([])],
    }).overrideComponent(OrganizationRailSwitcher, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockStore }] },
    });
  });

  it('should render one tile per organization plus the add tile', () => {
    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    const tiles = fixture.debugElement.queryAll(By.css('[data-testid="organization-rail-tile"]'));
    expect(tiles.length).toBe(2);
    expect(
      fixture.debugElement.query(By.css('[data-testid="organization-rail-add"]')),
    ).toBeTruthy();
  });

  it('should mark the active workspace and label logo-less tiles with the initial', () => {
    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    const tiles = fixture.debugElement.queryAll(By.css('[data-testid="organization-rail-tile"]'));
    expect(tiles[0].nativeElement.getAttribute('aria-current')).toBe('true');
    expect(tiles[0].nativeElement.textContent.trim()).toBe('A');
    // The second workspace has a logo: an image, no initial.
    expect(tiles[1].nativeElement.getAttribute('aria-current')).toBeNull();
    expect(tiles[1].query(By.css('img'))?.nativeElement.getAttribute('src')).toBe(
      'https://cdn/logo.png',
    );
  });

  it('should preserve the sub-route when switching workspace', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    vi.spyOn(router, 'url', 'get').mockReturnValue('/organizations/org-1/equipments?page=2');

    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    const tiles = fixture.debugElement.queryAll(By.css('[data-testid="organization-rail-tile"]'));
    tiles[1].nativeElement.click();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy.mock.calls[0][0].toString()).toBe('/organizations/org-2/equipments?page=2');
  });

  it('should not navigate when clicking the active workspace', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    fixture.debugElement
      .queryAll(By.css('[data-testid="organization-rail-tile"]'))[0]
      .nativeElement.click();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should route the add tile to onboarding', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('[data-testid="organization-rail-add"]'))
      .nativeElement.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should load organizations once when none are cached', () => {
    organizations.set([]);

    const fixture = TestBed.createComponent(OrganizationRailSwitcher);
    fixture.detectChanges();

    expect(loadOrganizations).toHaveBeenCalledTimes(1);
  });
});
