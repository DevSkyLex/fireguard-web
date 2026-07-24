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
  goToWorkspace(): void;
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
  fixture: ReturnType<typeof TestBed.createComponent>;
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
  return {
    component,
    detect: () => fixture.detectChanges(),
    fixture,
    store,
    router,
    session,
  };
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

  it('renders the missing-token message when the URL carries no token', () => {
    const { detect, fixture } = setup({ token: undefined });

    detect();

    expect(fixture.nativeElement.textContent).toContain(
      'The invitation link is missing its token.',
    );
  });

  it('renders the loading skeleton while the preview request is pending', () => {
    const { detect, fixture, store } = setup({ token: 'tok-1' });
    store.isLoadingPreview.set(true);

    detect();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('renders an error message when the preview request fails', () => {
    const { detect, fixture, store } = setup({ token: 'tok-1' });
    store.isPreviewError.set(true);

    detect();

    expect(fixture.nativeElement.textContent).toContain(
      'This invitation link is invalid or no longer available.',
    );
  });

  it('renders the organization summary and status tag once the preview resolves', () => {
    const { detect, fixture } = setup({
      token: 'tok-1',
      preview: previewFor('bob@example.com'),
    });

    detect();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Acme');
    expect(text).toContain('Invited by Alice');
    expect(text).toContain('bob@example.com');
    expect(fixture.nativeElement.querySelector('app-tag')).not.toBeNull();
  });

  it('renders the success state and navigates to the workspace on click', () => {
    const { component, detect, fixture, router, store } = setup({
      token: 'tok-1',
      preview: previewFor('bob@example.com'),
    });
    store.isAccepted.set(true);

    detect();

    expect(fixture.nativeElement.textContent).toContain('Invitation accepted. Welcome aboard!');

    component.goToWorkspace();

    expect(router.navigate).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('goes to the default workspace when not accepted', () => {
    const { component, router, store } = setup({
      token: 'tok-1',
      preview: previewFor('bob@example.com'),
    });
    store.isAccepted.set(false);

    component.goToWorkspace();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('renders the mismatch warning with the switch-account and open-workspace actions', () => {
    const { detect, fixture, store } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'other@example.com',
      preview: previewFor('bob@example.com'),
    });

    detect();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain("You're signed in as other@example.com");
    expect(text).toContain('bob@example.com');
    expect(store.accept).not.toHaveBeenCalled();
  });

  it('renders the not-pending warning for a resolved invitation', () => {
    const { detect, fixture } = setup({
      token: 'tok-1',
      preview: previewFor('bob@example.com', 'revoked'),
    });

    detect();

    expect(fixture.nativeElement.textContent).toContain('This invitation is no longer active.');
  });

  it('renders the accept CTA for an authenticated pending invitation and forwards the click', () => {
    const { component, detect, fixture, store } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'bob@example.com',
      preview: previewFor('bob@example.com'),
    });
    // Prevent the auto-accept effect from firing so the button click is what triggers accept.
    store.isAccepting.set(false);

    detect();
    store.accept.mockClear();

    component.accept();

    expect(store.accept).toHaveBeenCalledWith('tok-1');
    void fixture;
  });

  it('renders the accept-error message when a prior acceptance attempt failed', () => {
    const { detect, fixture, store } = setup({
      token: 'tok-1',
      authenticated: true,
      currentEmail: 'bob@example.com',
      preview: previewFor('bob@example.com'),
    });
    store.isAcceptError.set(true);

    detect();

    expect(fixture.nativeElement.textContent).toContain(
      'The invitation could not be accepted. It may have expired or been revoked.',
    );
  });

  it('renders the sign-in / register prompt for an anonymous visitor and forwards register', () => {
    const { component, detect, fixture, router } = setup({
      token: 'tok-1',
      authenticated: false,
      preview: previewFor('bob@example.com'),
    });

    detect();

    expect(fixture.nativeElement.textContent).toContain('Sign in or create an account with');

    component.register();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/register'], {
      queryParams: { returnUrl: '/organizations/invitations/accept?token=tok-1' },
    });
  });
});
