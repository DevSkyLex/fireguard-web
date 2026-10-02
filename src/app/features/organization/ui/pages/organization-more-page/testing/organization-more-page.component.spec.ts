import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { DeferBlockBehavior, TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LogoutControl } from '@features/auth';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { SLOT_PRESENTATION } from '@shared/layout-slot';
import { ThemeSwitcher } from '@shared/theme-switcher';
import { OrganizationMorePage } from '../organization-more-page.component';

describe('OrganizationMorePage', () => {
  let fixture: ComponentFixture<OrganizationMorePage>;
  let organizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<readonly string[]>;
  let organization: WritableSignal<OrganizationOutput | null>;

  beforeEach(async () => {
    organizationId = signal<string | null>('org-1');
    permissions = signal<readonly string[]>(['organization.*']);
    organization = signal<OrganizationOutput | null>({
      id: 'org-1',
      privacyContactEmail: 'privacy@example.org',
    } as OrganizationOutput);
    TestBed.configureTestingModule({
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId, selectedOrganization: organization },
        },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
      ],
    }).overrideComponent(OrganizationMorePage, {
      remove: { imports: [LogoutControl, ThemeSwitcher] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(OrganizationMorePage);
    await fixture.whenStable();
  });

  it('renders semantic grouped links, query-specific administration and all account routes', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('nav')).map((nav) => nav.id)).toEqual([
      'organization-more-operations',
      'organization-more-assets',
      'organization-more-collaboration',
      'organization-more-administration',
      'organization-more-account',
    ]);
    expect(root.querySelector('a[data-destination="billing"]')?.getAttribute('href')).toBe(
      '/organizations/org-1/settings?tab=subscription',
    );
    expect(root.querySelector('a[data-destination="teams"]')?.getAttribute('href')).toBe(
      '/organizations/org-1/members?tab=teams',
    );
    expect(root.querySelector('a[data-destination="roles"]')?.getAttribute('href')).toBe(
      '/organizations/org-1/members?tab=roles',
    );
    expect(root.querySelectorAll('a[data-destination="notifications"]')).toHaveLength(1);
    expect(root.querySelector('a[data-destination="notifications"]')?.getAttribute('href')).toBe(
      '/account/notifications',
    );
    expect(root.querySelector('a[data-destination="notification-preferences"]')).toBeNull();
    expect(root.querySelector('a[data-destination="organizations"]')?.getAttribute('href')).toBe(
      '/account/organizations',
    );
    expect(root.querySelectorAll('h1')).toHaveLength(0);
  });

  it('renders an SVG for every allowed destination, including equipment', () => {
    const root = fixture.nativeElement as HTMLElement;
    const equipment = root.querySelector('a[data-destination="equipments"]');
    expect(equipment?.getAttribute('href')).toBe('/organizations/org-1/equipments');
    expect(equipment?.querySelector('ng-icon svg')).not.toBeNull();
    for (const link of root.querySelectorAll('a[data-destination]')) {
      expect(
        link.querySelector('[hlmItemMedia] ng-icon svg'),
        link.getAttribute('data-destination') ?? '',
      ).not.toBeNull();
    }
  });

  it('composes public appearance and sign-out controls without owning their behavior', async () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#organization-more-appearance-title')?.textContent).toContain(
      'Appearance',
    );
    expect(root.querySelectorAll('app-theme-switcher')).toHaveLength(1);
    expect(root.querySelectorAll('app-logout-control')).toHaveLength(1);
    expect(fixture.debugElement.injector.get(SLOT_PRESENTATION)).toBe('menu');
    expect(await fixture.getDeferBlocks()).toHaveLength(1);
  });

  it('removes denied sections and refreshes routes on a context change', async () => {
    organizationId.set('org-2');
    permissions.set(['organization.events.read']);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a[data-destination="calendar"]')?.getAttribute('href')).toBe(
      '/organizations/org-2/calendar',
    );
    expect(
      root.querySelectorAll(
        '#organization-more-administration, #organization-more-collaboration, #organization-more-assets',
      ),
    ).toHaveLength(0);
    expect(root.querySelectorAll('#organization-more-account')).toHaveLength(1);
  });

  it('does not defer or request an organization switcher without active context', async () => {
    organizationId.set(null);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('#organization-more-workspace-title')).toHaveLength(0);
    expect(await fixture.getDeferBlocks()).toHaveLength(0);
    expect(root.querySelector('#organization-more-privacy')).toBeNull();
    expect(
      Array.from(root.querySelectorAll('a')).every((link) =>
        link.getAttribute('href')?.startsWith('/account/'),
      ),
    ).toBe(true);
  });

  it('shows the contact to a member without settings-write and provides only an email destination', async () => {
    permissions.set(['organization.events.read']);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#organization-more-privacy-title')?.textContent).toContain(
      'Data protection contact',
    );
    const link = root.querySelector('#organization-more-privacy a');
    expect(link?.getAttribute('href')).toBe('mailto:privacy@example.org');
    expect(link?.textContent).toBe('privacy@example.org');
    expect(root.querySelector('a[data-destination="settings"]')).toBeNull();
    expect(root.querySelector('#organization-more-privacy')?.textContent).toContain(
      "Fireguard's own processing is handled separately.",
    );
  });

  it('uses a discreet fallback without an email link when the contact is absent', async () => {
    organization.set({ id: 'org-1', privacyContactEmail: null } as OrganizationOutput);
    await fixture.whenStable();
    const section = (fixture.nativeElement as HTMLElement).querySelector(
      '#organization-more-privacy',
    );
    expect(section?.textContent).toContain("Use the organization's usual contact channels.");
    expect(section?.querySelector('a')).toBeNull();
  });

  it('encodes reserved recipient characters instead of pre-filling message parameters', async () => {
    organization.set({
      id: 'org-1',
      privacyContactEmail: 'privacy?team@example.org',
    } as OrganizationOutput);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '#organization-more-privacy a',
    );
    expect(link?.getAttribute('href')).toBe('mailto:privacy%3Fteam@example.org');
  });

  it('does not show a contact still belonging to the previous organization', async () => {
    organizationId.set('org-2');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
