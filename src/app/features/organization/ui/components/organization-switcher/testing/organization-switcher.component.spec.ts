import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { OrganizationSwitcher } from '../organization-switcher.component';

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

describe('OrganizationSwitcher', () => {
  const mockOrganizationStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
    organizations: signal<OrganizationOutput[]>([MOCK_ORG]),
    isLoadingOrganizations: signal(false),
    isLoadingOrganization: signal(false),
    loadOrganizations: vi.fn(),
  };

  beforeEach(() => {
    mockOrganizationStore.selectedOrganization.set(MOCK_ORG);
    mockOrganizationStore.organizations.set([MOCK_ORG]);
    mockOrganizationStore.isLoadingOrganizations.set(false);
    mockOrganizationStore.isLoadingOrganization.set(false);
    mockOrganizationStore.loadOrganizations.mockReset();

    TestBed.configureTestingModule({
      imports: [OrganizationSwitcher],
      providers: [provideRouter([])],
    }).overrideComponent(OrganizationSwitcher, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockOrganizationStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the trigger sub-component', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-organization-switcher-trigger'))).not.toBeNull();
  });

  it('should render the popover element', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    // Popover sub-components are rendered lazily (only when the popover is open);
    // verify that the host p-popover element is present in the template.
    expect(fixture.debugElement.query(By.css('p-popover'))).not.toBeNull();
  });

  it('should call loadOrganizations on init when the organizations list is empty', () => {
    mockOrganizationStore.organizations.set([]);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).toHaveBeenCalledTimes(1);
  });

  it('should not call loadOrganizations on init when organizations are already loaded', () => {
    mockOrganizationStore.organizations.set([MOCK_ORG]);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should not call loadOrganizations on init when a list request is already pending', () => {
    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.isLoadingOrganizations.set(true);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should not call loadOrganizations again when the menu is opened after eager loading started', () => {
    mockOrganizationStore.organizations.set([]);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    expect(mockOrganizationStore.loadOrganizations).toHaveBeenCalledTimes(1);
    mockOrganizationStore.isLoadingOrganizations.set(true);
    mockOrganizationStore.loadOrganizations.mockClear();

    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(
        popoverEl.componentInstance as { toggle(event: MouseEvent): void },
        'toggle',
      ).mockReturnValue(undefined);
    }

    const component = fixture.componentInstance as unknown as {
      toggle(event: MouseEvent): void;
    };
    component.toggle(new MouseEvent('click'));

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should not call loadOrganizations when the menu is opened and organizations are already loaded', () => {
    mockOrganizationStore.organizations.set([MOCK_ORG]);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(
        popoverEl.componentInstance as { toggle(event: MouseEvent): void },
        'toggle',
      ).mockReturnValue(undefined);
    }

    const component = fixture.componentInstance as unknown as {
      toggle(event: MouseEvent): void;
    };
    component.toggle(new MouseEvent('click'));

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should not call loadOrganizations when the menu is opened while a list request is already pending', () => {
    mockOrganizationStore.organizations.set([]);
    mockOrganizationStore.isLoadingOrganizations.set(true);
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(
        popoverEl.componentInstance as { toggle(event: MouseEvent): void },
        'toggle',
      ).mockReturnValue(undefined);
    }

    const component = fixture.componentInstance as unknown as {
      toggle(event: MouseEvent): void;
    };
    component.toggle(new MouseEvent('click'));

    expect(mockOrganizationStore.loadOrganizations).not.toHaveBeenCalled();
  });

  it('should navigate to the new organization URL when onOrganizationChange is called', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    // Simulate being on an organization page so the URL replace works correctly.
    vi.spyOn(router, 'url', 'get').mockReturnValue('/organizations/org-1/dashboard');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    // Stub popover.hide so it does not throw outside of a real browser context
    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(popoverEl.componentInstance as { hide(): void }, 'hide').mockReturnValue(undefined);
    }

    const newOrg = { ...MOCK_ORG, id: 'org-2', name: 'Beta Inc' } as OrganizationOutput;
    const component = fixture.componentInstance as unknown as {
      onOrganizationChange(org: OrganizationOutput): void;
    };
    component.onOrganizationChange(newOrg);

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const calledUrl = navigateSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('org-2');
    expect(calledUrl).toContain('dashboard');
  });

  it('should navigate to /onboarding when navigateToNewOrganization is called', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // Stub popover.hide so it does not throw outside of a real browser context
    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(popoverEl.componentInstance as { hide(): void }, 'hide').mockReturnValue(undefined);
    }

    const component = fixture.componentInstance as unknown as {
      navigateToNewOrganization(): void;
    };
    component.navigateToNewOrganization();

    expect(navigateSpy).toHaveBeenCalledWith(['/onboarding']);
  });

  it('should pass the selected organization to the trigger', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const triggerEl = fixture.debugElement.query(By.css('app-organization-switcher-trigger'));
    expect(triggerEl).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should not navigate when onOrganizationChange is called with a null org', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const component = fixture.componentInstance as unknown as {
      onOrganizationChange(org: OrganizationOutput | null): void;
    };
    component.onOrganizationChange(null);

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should navigate to /organizations/{orgId} when switching from a non-organization page', () => {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/account/notifications');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const popoverEl = fixture.debugElement.query(By.css('p-popover'));
    if (popoverEl) {
      vi.spyOn(popoverEl.componentInstance as { hide(): void }, 'hide').mockReturnValue(undefined);
    }

    const newOrg = { ...MOCK_ORG, id: 'org-2', name: 'Beta Inc' } as OrganizationOutput;
    const component = fixture.componentInstance as unknown as {
      onOrganizationChange(org: OrganizationOutput): void;
    };
    component.onOrganizationChange(newOrg);

    expect(navigateSpy).toHaveBeenCalledWith('/organizations/org-2');
  });
});
