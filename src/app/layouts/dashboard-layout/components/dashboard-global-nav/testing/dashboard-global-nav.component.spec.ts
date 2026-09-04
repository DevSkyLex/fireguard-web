import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ORGANIZATION_CONTEXT_PORT, OrganizationPermissionService } from '@features/organization';
import { DashboardGlobalNav } from '../dashboard-global-nav.component';

describe('DashboardGlobalNav', () => {
  let fixture: ComponentFixture<DashboardGlobalNav>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;

  /**
   * Function rows
   * @function rows
   *
   * @description
   * Reads rendered navigation labels in display order.
   *
   * @returns {readonly string[]} The visible destination labels.
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
    expect(rows()).toEqual(['Support']);
  });

  it('should render a destination that does not exist yet as unavailable', () => {
    const support: HTMLElement | null = fixture.nativeElement.querySelector('#global-nav-support');

    expect(support?.tagName).toBe('BUTTON'); // An anchor would be a link to a 404.
    expect(support?.getAttribute('aria-disabled')).toBe('true');
  });

  it('should say why an unavailable destination does nothing', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-slot="sidebar-menu-badge"]').length).toBe(
      1,
    );
  });
});
