import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { MEMBER_DIRECTORY_PORT, ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationMemberProfilePage } from '../organization-member-profile-page.component';

const ADA: MemberDirectoryEntry = {
  memberId: 'member-1',
  displayName: 'Ada Lovelace',
  avatarUrl: 'https://api.test/avatar.webp',
  roleNames: ['Inspector', 'Reviewer'],
  isActive: true,
};

describe('OrganizationMemberProfilePage', () => {
  let fixture: ComponentFixture<OrganizationMemberProfilePage>;
  let byId: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>>;
  let isAvailable: WritableSignal<boolean>;
  let isLoading: WritableSignal<boolean>;
  let ensureLoaded: ReturnType<typeof vi.fn>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let hasPermission: ReturnType<typeof vi.fn>;

  async function render(memberId: string = 'member-1'): Promise<void> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: { byId, isAvailable, isLoading, ensureLoaded, displayNameFor: vi.fn() },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId,
            selectedOrganization: signal(null),
            isLoadingOrganization: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });

    fixture = TestBed.createComponent(OrganizationMemberProfilePage);
    fixture.componentRef.setInput('memberId', memberId);
    await fixture.whenStable();
  }

  beforeEach(() => {
    byId = signal<ReadonlyMap<string, MemberDirectoryEntry>>(new Map([[ADA.memberId, ADA]]));
    isAvailable = signal(true);
    isLoading = signal(false);
    ensureLoaded = vi.fn();
    selectedOrganizationId = signal<string | null>('org-1');
    hasPermission = vi.fn().mockReturnValue(true);
  });

  it('should show who the person is', async () => {
    await render();

    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('Inspector, Reviewer');
  });

  it('should show nothing private and no way to change anything', async () => {
    await render();
    const element: HTMLElement = fixture.nativeElement;

    // None of this reaches the client for another person in the first place —
    // the member list is the only source, and it carries none of it.
    expect(element.textContent).not.toContain('Email');
    expect(element.textContent).not.toContain('Last sign-in');
    expect(element.textContent).not.toContain('Two-factor');
    expect(element.querySelectorAll('button').length).toBe(0);
    expect(element.querySelectorAll('input').length).toBe(0);
  });

  it('should name an inactive membership', async () => {
    byId.set(new Map([[ADA.memberId, { ...ADA, isActive: false }]]));
    await render();

    // Worth saying: it explains why this person is not being assigned work.
    expect(fixture.nativeElement.textContent).toContain('Inactive');
  });

  it('should load the directory of the organization currently open', async () => {
    await render();

    expect(ensureLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should not ask for a directory when no organization is open', async () => {
    selectedOrganizationId.set(null);
    await render();

    expect(ensureLoaded).not.toHaveBeenCalled();
  });

  it('should explain a missing permission rather than offer a retry', async () => {
    isAvailable.set(false);
    await render();

    // The store never called: reading the directory needs
    // `organization.members.read`, so "couldn't load" would suggest a retry
    // that cannot work.
    expect(fixture.nativeElement.textContent).toContain("You can't view members here");
    expect(fixture.nativeElement.textContent).not.toContain('Retry');
  });

  it('should say so when the directory holds nobody by that id', async () => {
    await render('member-unknown');

    expect(fixture.nativeElement.textContent).toContain("We don't know who that is");
  });

  it('should show placeholders rather than a missing state while loading', async () => {
    isLoading.set(true);
    await render('member-unknown');

    expect(fixture.nativeElement.textContent).not.toContain("We don't know who that is");
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
  });

  describe('interventions link', () => {
    it('should link to interventions pre-filtered by this member as responsible', async () => {
      await render();

      const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
        '[data-testid="organization-member-profile-interventions"]',
      );

      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe(
        '/organizations/org-1/interventions?responsible=member-1',
      );
    });

    it('should hide the link without organization.interventions.read', async () => {
      hasPermission.mockReturnValue(false);
      await render();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="organization-member-profile-interventions"]',
        ),
      ).toBeNull();
    });
  });
});
