import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { FeedbackService } from '@core/feedback';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationInvitationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationMembersStore } from '@features/organization/state/organization-members';
import { OrganizationSettingsInvitationsPage } from '../organization-settings-invitations.component';

type InvitationsPageTestApi = OrganizationSettingsInvitationsPage & {
  reload(): void;
  revokeInvitation(invitation: OrganizationInvitationOutput): void;
  resendInvitation(invitation: OrganizationInvitationOutput): void;
  copyLink(invitation: OrganizationInvitationOutput): void;
};

const INVITATION: OrganizationInvitationOutput = {
  id: 'inv-1',
  email: 'invitee@example.com',
  status: 'pending',
  roleIds: [],
  createdAt: '2026-07-01T00:00:00Z',
  expiresAt: '2999-01-01T00:00:00Z',
} as unknown as OrganizationInvitationOutput;

describe('OrganizationSettingsInvitationsPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
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
  });

  let store: {
    load: ReturnType<typeof vi.fn>;
    revokeInvitation: ReturnType<typeof vi.fn>;
    resendInvitation: ReturnType<typeof vi.fn>;
    activeInvitations: WritableSignal<readonly OrganizationInvitationOutput[]>;
    roles: WritableSignal<readonly never[]>;
    isLoading: WritableSignal<boolean>;
    // The invite drawer, mounted on this tab since 1.1.0, binds the store's
    // mutation state to disable its submit while a send is in flight.
    isMutating: WritableSignal<boolean>;
    invite: ReturnType<typeof vi.fn>;
    loadError: WritableSignal<{ message?: string } | null>;
    mutationError: WritableSignal<{ message?: string } | null>;
    invitationLinks: WritableSignal<Record<string, string>>;
  };
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };
  let permissions: {
    hasPermission: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: FeedbackService, useValue: { show: vi.fn() } },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
        { provide: OrganizationPermissionService, useValue: permissions },
      ],
    });
    TestBed.overrideComponent(OrganizationSettingsInvitationsPage, {
      set: { providers: [{ provide: OrganizationMembersStore, useValue: store }] },
    });
  };

  const createComponent = (): InvitationsPageTestApi =>
    TestBed.createComponent(OrganizationSettingsInvitationsPage)
      .componentInstance as unknown as InvitationsPageTestApi;

  beforeEach(() => {
    store = {
      load: vi.fn(),
      revokeInvitation: vi.fn(),
      resendInvitation: vi.fn(),
      activeInvitations: signal<readonly OrganizationInvitationOutput[]>([]),
      roles: signal<readonly never[]>([]),
      isLoading: signal<boolean>(false),
      isMutating: signal<boolean>(false),
      invite: vi.fn(),
      loadError: signal<{ message?: string } | null>(null),
      mutationError: signal<{ message?: string } | null>(null),
      invitationLinks: signal<Record<string, string>>({}),
    };
    confirmationService = { confirm: vi.fn() };
    permissions = {
      hasPermission: vi.fn().mockReturnValue(true),
      hasAnyPermission: vi.fn().mockReturnValue(true),
    };
  });

  it('loads invitations (never members) on init, with roles when readable', () => {
    configure();
    createComponent();

    expect(store.load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      includeMembers: false,
      includeInvitations: true,
      includeRoles: true,
    });
  });

  it('skips loading roles when the member cannot read them', () => {
    permissions.hasAnyPermission.mockReturnValue(false);
    configure();
    createComponent();

    expect(store.load).toHaveBeenCalledWith(
      expect.objectContaining({ includeInvitations: true, includeRoles: false }),
    );
  });

  it('renders the invitation table', () => {
    configure();
    const fixture = TestBed.createComponent(OrganizationSettingsInvitationsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-organization-invitation-table')).not.toBeNull();
  });

  it('resends an invitation against the active organization', () => {
    configure();
    const component = createComponent();

    component.resendInvitation(INVITATION);

    expect(store.resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv-1',
    });
  });

  it('revokes an invitation only after confirmation', () => {
    configure();
    const component = createComponent();

    component.revokeInvitation(INVITATION);

    expect(store.revokeInvitation).not.toHaveBeenCalled();
    const confirmation = confirmationService.confirm.mock.calls[0]?.[0] as Confirmation;
    confirmation.accept?.();
    expect(store.revokeInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv-1',
    });
  });

  it('regenerates the link through a confirmed resend when no fresh link is cached', () => {
    configure();
    const component = createComponent();

    component.copyLink(INVITATION);

    expect(store.resendInvitation).not.toHaveBeenCalled();
    const confirmation = confirmationService.confirm.mock.calls[0]?.[0] as Confirmation;
    confirmation.accept?.();
    expect(store.resendInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitationId: 'inv-1',
    });
  });
});
