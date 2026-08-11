import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import type { MockInstance } from 'vitest';
import { toStoreError, type StoreError } from '@core/request-state';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth';
import type { OrganizationInvitationPreviewOutput } from '@features/organization/models';
import { OrganizationInvitationAcceptStore } from '@features/organization/state/organization-invitation-accept';
import { OrganizationInvitationAcceptPage } from '../organization-invitation-accept-page.component';

/**
 * Builds the minimum preview the page reads, with a status the caller can
 * override. `roleNames` is left off the object entirely when omitted, which is
 * how the API represents "no roleNames field" — distinct from an empty list.
 */
function preview(
  status: OrganizationInvitationPreviewOutput['status'] = 'pending',
  roleNames?: ReadonlyArray<string>,
): OrganizationInvitationPreviewOutput {
  return {
    id: '/organization_invitations/inv-1',
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
    organizationLogoUrl: null,
    inviterDisplayName: 'Ada Lovelace',
    invitedEmail: 'bob@example.com',
    status,
    expiresAt: '2026-02-01T00:00:00+00:00',
    ...(roleNames === undefined ? {} : { roleNames }),
  } as unknown as OrganizationInvitationPreviewOutput;
}

describe('OrganizationInvitationAcceptPage', () => {
  let fixture: ComponentFixture<OrganizationInvitationAcceptPage>;
  let isLoadingPreview: WritableSignal<boolean>;
  let isPreviewError: WritableSignal<boolean>;
  let previewSignal: WritableSignal<OrganizationInvitationPreviewOutput | null>;
  let isAccepting: WritableSignal<boolean>;
  let isAccepted: WritableSignal<boolean>;
  let isAcceptError: WritableSignal<boolean>;
  let acceptError: WritableSignal<StoreError | null>;
  let isAuthenticated: WritableSignal<boolean>;
  let loadPreview: ReturnType<typeof vi.fn>;
  let accept: ReturnType<typeof vi.fn>;
  let navigate: MockInstance;

  async function render(token: string | undefined): Promise<void> {
    TestBed.resetTestingModule();

    const mockStore = {
      isLoadingPreview,
      isPreviewError,
      preview: previewSignal,
      isAccepting,
      isAccepted,
      isAcceptError,
      acceptError,
      loadPreview,
      accept,
    };

    const authSession: AuthSessionPort = {
      accessToken: signal<string | null>(null),
      isAuthenticated,
      initialized: signal(true),
      clearSession: vi.fn(),
      renewSession: vi.fn().mockReturnValue(of(null)),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AUTH_SESSION_PORT, useValue: authSession },
      ],
    });

    TestBed.overrideComponent(OrganizationInvitationAcceptPage, {
      set: { providers: [{ provide: OrganizationInvitationAcceptStore, useValue: mockStore }] },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(OrganizationInvitationAcceptPage);
    if (token !== undefined) fixture.componentRef.setInput('token', token);
    await fixture.whenStable();
  }

  beforeEach(() => {
    isLoadingPreview = signal(false);
    isPreviewError = signal(false);
    previewSignal = signal<OrganizationInvitationPreviewOutput | null>(null);
    isAccepting = signal(false);
    isAccepted = signal(false);
    isAcceptError = signal(false);
    acceptError = signal<StoreError | null>(null);
    isAuthenticated = signal(true);
    loadPreview = vi.fn();
    accept = vi.fn();
  });

  it('should show the FireGuard mark above the card', async () => {
    await render(undefined);

    expect(fixture.nativeElement.textContent).toContain('FireGuard');
  });

  it('should show the missing-token card and never request a preview without one', async () => {
    await render(undefined);

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="organization-invitation-accept-missing-token"]',
      ),
    ).not.toBeNull();
    expect(loadPreview).not.toHaveBeenCalled();
  });

  it('should ask the store for the preview of the token it was given', async () => {
    await render('tok-1');

    expect(loadPreview).toHaveBeenCalledWith('tok-1');
  });

  it('should show a skeleton while the preview is loading', async () => {
    isLoadingPreview.set(true);
    await render('tok-1');

    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-invitation-accept-loading"]'),
    ).not.toBeNull();
  });

  it('should show the preview-error card when the preview request failed', async () => {
    isPreviewError.set(true);
    await render('tok-1');

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="organization-invitation-accept-preview-error"]',
      ),
    ).not.toBeNull();
  });

  it('should render the invite details on a pending preview', async () => {
    previewSignal.set(preview('pending'));
    await render('tok-1');
    const text: string = fixture.nativeElement.textContent;

    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-invitation-accept-card"]'),
    ).not.toBeNull();
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('bob@example.com');
  });

  it('should list the granted roles as badges on a pending preview', async () => {
    previewSignal.set(preview('pending', ['inspector', 'technicien']));
    await render('tok-1');
    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="organization-invitation-accept-roles"]',
    );

    expect(row).not.toBeNull();
    expect(
      Array.from(row?.querySelectorAll('dd span') ?? []).map((badge: Element): string =>
        (badge.textContent ?? '').trim(),
      ),
    ).toEqual(['inspector', 'technicien']);
  });

  it('should say no role when the invitation grants none', async () => {
    previewSignal.set(preview('pending', []));
    await render('tok-1');
    const row: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="organization-invitation-accept-roles"]',
    );

    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('No role');
  });

  it('should omit the roles row when the API sent no roleNames field', async () => {
    previewSignal.set(preview('pending'));
    await render('tok-1');

    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-invitation-accept-roles"]'),
    ).toBeNull();
  });

  it('should accept through the store when the visitor is signed in', async () => {
    previewSignal.set(preview('pending'));
    isAuthenticated.set(true);
    await render('tok-1');

    fixture.nativeElement
      .querySelector('[data-testid="organization-invitation-accept-submit"]')
      .click();
    await fixture.whenStable();

    expect(accept).toHaveBeenCalledWith('tok-1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should redirect to sign-in with a returnUrl when the visitor is not signed in', async () => {
    previewSignal.set(preview('pending'));
    isAuthenticated.set(false);
    await render('tok-1');
    const router: Router = TestBed.inject(Router);

    fixture.nativeElement
      .querySelector('[data-testid="organization-invitation-accept-submit"]')
      .click();
    await fixture.whenStable();

    expect(accept).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: router.url },
    });
  });

  it('should show the destructive alert when acceptance failed', async () => {
    previewSignal.set(preview('pending'));
    isAcceptError.set(true);
    acceptError.set(toStoreError(new Error('This invitation was just revoked.')));
    await render('tok-1');

    const alert: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="organization-invitation-accept-error"]',
    );

    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('This invitation was just revoked.');
  });

  it.each([
    ['accepted' as const, 'Accepted'],
    ['expired' as const, 'Expired'],
    ['revoked' as const, 'Revoked'],
  ])('should show the unavailable card for a %s invitation', async (status, badgeText) => {
    previewSignal.set(preview(status));
    await render('tok-1');
    const card: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="organization-invitation-accept-unavailable"]',
    );

    expect(card).not.toBeNull();
    expect(card?.textContent).toContain(badgeText);
  });

  it('should show the success card with a link to the joined organization', async () => {
    previewSignal.set(preview('pending'));
    isAccepted.set(true);
    await render('tok-1');
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="organization-invitation-accept-open"]',
    );

    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-invitation-accept-success"]'),
    ).not.toBeNull();
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/organizations/org-1');
  });
});
