import { PLATFORM_ID, signal, type Signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import type { OrganizationInvitationPreviewOutput } from '@features/organization/models';
import { OrganizationInvitationAcceptStore } from '@features/organization/state/organization-invitation-accept';
import { OrganizationInvitationAcceptPage } from '../organization-invitation-accept.component';

type AcceptPageTestApi = OrganizationInvitationAcceptPage & {
  readonly token: string;
  readonly emailMismatch: Signal<boolean>;
  accept(): void;
  signIn(): void;
  register(): void;
  switchAccount(): void;
};

interface StoreMock {
  preview: WritableSignal<OrganizationInvitationPreviewOutput | null>;
  isLoadingPreview: WritableSignal<boolean>;
  isPreviewError: WritableSignal<boolean>;
  isAccepting: WritableSignal<boolean>;
  isAccepted: WritableSignal<boolean>;
  isAcceptError: WritableSignal<boolean>;
  acceptError: WritableSignal<unknown>;
  loadPreview: ReturnType<typeof vi.fn>;
  accept: ReturnType<typeof vi.fn>;
}

const previewFor = (
  invitedEmail: string,
  status = 'pending',
): OrganizationInvitationPreviewOutput =>
  ({
    organizationId: 'org-1',
    organizationName: 'Acme',
    organizationLogoUrl: null,
    inviterDisplayName: 'Alice',
    invitedEmail,
    status,
    expiresAt: '2026-02-01',
  }) as unknown as OrganizationInvitationPreviewOutput;

interface SetupOptions {
  readonly token?: string;
  readonly authenticated?: boolean;
  readonly currentEmail?: string | null;
  readonly preview?: OrganizationInvitationPreviewOutput | null;
}

function setup(options: SetupOptions = {}): {
  component: AcceptPageTestApi;
  detect(): void;
  store: StoreMock;
  router: { navigate: ReturnType<typeof vi.fn> };
  session: { clearSession: ReturnType<typeof vi.fn> };
} {
  const store: StoreMock = {
    preview: signal(options.preview ?? null),
    isLoadingPreview: signal(false),
    isPreviewError: signal(false),
    isAccepting: signal(false),
    isAccepted: signal(false),
    isAcceptError: signal(false),
    acceptError: signal<unknown>(null),
    loadPreview: vi.fn(),
    accept: vi.fn(),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const session = {
    accessToken: signal<string | null>(null),
    isAuthenticated: signal(options.authenticated ?? false),
    initialized: signal(true),
    clearSession: vi.fn(),
  };
  const profile =
    options.currentEmail === undefined || options.currentEmail === null
      ? null
      : { email: options.currentEmail };
  const identity = {
    profile: signal(profile),
    displayName: signal<string | null>(null),
    initials: signal<string | null>(null),
    avatarUrl: signal<string | null>(null),
    avatarUrlSmall: signal<string | null>(null),
    isLoading: signal(false),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(options.token ? { token: options.token } : {}),
          },
        },
      },
      { provide: Router, useValue: router },
      { provide: AUTH_SESSION_PORT, useValue: session },
      { provide: USER_IDENTITY_PORT, useValue: identity },
    ],
  });
  TestBed.overrideComponent(OrganizationInvitationAcceptPage, {
    set: { providers: [{ provide: OrganizationInvitationAcceptStore, useValue: store }] },
  });

  const fixture = TestBed.createComponent(OrganizationInvitationAcceptPage);
  const component = fixture.componentInstance as unknown as AcceptPageTestApi;
  return { component, detect: () => fixture.detectChanges(), store, router, session };
}

describe('OrganizationInvitationAcceptPage', () => {
  it('loads the public preview for the URL token on init', () => {
    const { store } = setup({ token: 'tok-1' });
    expect(store.loadPreview).toHaveBeenCalledWith('tok-1');
  });

  it('auto-accepts for an authenticated user whose email matches the invite', () => {
    const { detect, store } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'bob@example.com',
      preview: previewFor('bob@example.com'),
    });

    detect();

    expect(store.accept).toHaveBeenCalledWith('tok-1');
  });

  it('does not auto-accept when the signed-in email differs from the invite', () => {
    const { component, detect, store } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'other@example.com',
      preview: previewFor('bob@example.com'),
    });

    detect();

    expect(component.emailMismatch()).toBe(true);
    expect(store.accept).not.toHaveBeenCalled();
  });

  it('sends an unauthenticated visitor to sign in, carrying a returnUrl', () => {
    const { component, router } = setup({ token: 'tok 1', authenticated: false });

    component.signIn();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/organizations/invitations/accept?token=tok%201' },
    });
  });

  it('clears the session and routes to login when switching account', () => {
    const { component, router, session } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'other@example.com',
      preview: previewFor('bob@example.com'),
    });

    component.switchAccount();

    expect(session.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/organizations/invitations/accept?token=tok-1' },
    });
  });
});
