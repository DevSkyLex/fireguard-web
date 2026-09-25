import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import { OrganizationMobileNavigation } from '../organization-mobile-navigation.component';

describe('OrganizationMobileNavigation', () => {
  let fixture: ComponentFixture<OrganizationMobileNavigation>;
  let organizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<readonly string[]>;
  let router: Router;

  beforeEach(async () => {
    organizationId = signal<string | null>('org-1');
    permissions = signal<readonly string[]>(['organization.*']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId },
        },
        { provide: ORGANIZATION_MEMBER_ACCESS_PORT, useValue: { permissions } },
      ],
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl('/organizations/org-1');
    fixture = TestBed.createComponent(OrganizationMobileNavigation);
    await fixture.whenStable();
  });

  it('renders real, named links with icons and exactly one current destination', () => {
    const root = fixture.nativeElement as HTMLElement;
    const links = Array.from(root.querySelectorAll('a'));
    expect(links.map((link) => link.dataset['destination'])).toEqual([
      'dashboard',
      'interventions',
      'assets',
      'messages',
      'more',
    ]);
    expect(
      links.every(
        (link) => link.textContent?.trim() && link.querySelector('ng-icon[aria-hidden="true"]'),
      ),
    ).toBe(true);
    expect(root.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-testid="mobile-nav-active-indicator"]')).toHaveLength(1);
    expect(
      root.querySelector('[aria-current="page"] [data-testid="mobile-nav-active-indicator"]'),
    ).not.toBeNull();
    const active = root.querySelector<HTMLElement>('[aria-current="page"]');
    const indicator = active?.querySelector<HTMLElement>(
      '[data-testid="mobile-nav-active-indicator"]',
    );
    expect(indicator?.classList).toContain('w-8');
    expect(indicator?.classList).toContain('h-0.5');
    expect(indicator?.classList).toContain('-top-px');
    expect(active?.className).not.toContain('bg-primary');
    expect(root.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(
      '/organizations/org-1',
    );
  });

  it('updates selection for deep routes and secondary pages without clicking a tab', async () => {
    await router.navigateByUrl('/organizations/org-1/messages/thread-1');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-current="page"]')?.getAttribute('data-destination')).toBe(
      'messages',
    );
    await router.navigateByUrl('/account/notifications?tab=preferences');
    await fixture.whenStable();
    expect(root.querySelector('[aria-current="page"]')?.getAttribute('data-destination')).toBe(
      'more',
    );
  });

  it('derives hrefs and permissions reactively when the organization changes', async () => {
    organizationId.set('org-2');
    permissions.set(['organization.messaging.read']);
    await router.navigateByUrl('/organizations/org-2/messages');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toEqual(
      ['/organizations/org-2/messages', '/organizations/org-2/more'],
    );
    expect(root.querySelector('[aria-current="page"]')?.getAttribute('data-destination')).toBe(
      'messages',
    );
  });

  it('renders a useful no-organization fallback with no organization links', async () => {
    organizationId.set(null);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toEqual(
      ['/account/profile', '/account/organizations'],
    );
    expect(root.textContent).toContain('Choose an organization');
  });
});
