import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_PERMISSION,
  OrganizationPermissionService,
} from '@features/organization';
import { DashboardGlobalNav } from '../dashboard-global-nav.component';

describe('DashboardGlobalNav', () => {
  let fixture: ComponentFixture<DashboardGlobalNav>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;

  /**
   * The rendered rows, in order, whether or not they lead anywhere.
   */
  function rows(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-slot="sidebar-menu-button"]',
      ) as NodeListOf<HTMLElement>,
    ).map((row: HTMLElement): string => row.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    selectedOrganizationId = signal<string | null>('org-1');
    permissions = signal<ReadonlyArray<string>>([]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId,
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasAnyPermission: (required: ReadonlyArray<string>): boolean =>
              required.some((permission: string): boolean =>
                permissions().some(
                  (granted: string): boolean =>
                    granted === permission ||
                    (granted.endsWith('.*') && permission.startsWith(granted.slice(0, -1))),
                ),
              ),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DashboardGlobalNav);
    await fixture.whenStable();
  });

  it('should list the destinations no permission gates', () => {
    expect(rows()).toEqual(['Assistant', 'Support']);
  });

  it('should render a destination that does not exist yet as unavailable', () => {
    const assistant: HTMLElement | null =
      fixture.nativeElement.querySelector('#global-nav-assistant');

    expect(assistant?.tagName).toBe('BUTTON'); // An anchor would be a link to a 404.
    expect(assistant?.getAttribute('aria-disabled')).toBe('true');
  });

  it('should say why an unavailable destination does nothing', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-slot="sidebar-menu-badge"]').length).toBe(
      2,
    );
  });

  it('should list messages under support once the permission is granted', async () => {
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    await fixture.whenStable();

    expect(rows()).toEqual(['Assistant', 'Support', 'Messages']);
  });

  it('should honour a namespace wildcard grant', async () => {
    permissions.set(['organization.*']);
    await fixture.whenStable();

    expect(rows()).toEqual(['Assistant', 'Support', 'Messages']);
  });

  it('should point messages at the organization currently open', async () => {
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    await fixture.whenStable();

    const messages: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('#global-nav-messages');

    expect(messages?.getAttribute('href')).toBe('/organizations/org-1/messages');
  });

  it('should withhold messages while no organization is known', async () => {
    permissions.set([ORGANIZATION_PERMISSION.MESSAGING_READ]);
    selectedOrganizationId.set(null);
    await fixture.whenStable();

    expect(rows()).toEqual(['Assistant', 'Support']); // A "Soon" badge would be a lie.
  });

  it('should sit at the bottom of the column', () => {
    expect((fixture.nativeElement as HTMLElement).classList).toContain('mt-auto');
  });
});
