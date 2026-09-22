import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { NOTIFICATION_CENTER_PORT } from '@features/account';
import type { EmailOwnershipChallengeOutput, EmailOwnershipOutput } from '@features/auth/models';
import { OtpForm } from '@features/auth/ui/forms';
import { OnboardingStore, WorkspaceStore } from '@features/onboarding/state';
import type {
  OrganizationAdmissionOutput,
  OrganizationJoinOptionsOutput,
  OrganizationJoinRequestOutput,
} from '@features/organization/models';
import { OnboardingWorkspacePage } from '../onboarding-workspace-page.component';

describe('OnboardingWorkspacePage', () => {
  const emptyOptions: OrganizationJoinOptionsOutput = {
    '@id': '/api/me/workspace-options',
    '@type': 'JoinOptions',
    emailProofRequired: false,
    invitations: [],
    organizations: [],
    requests: [],
  };
  const request: OrganizationJoinRequestOutput = {
    '@id': '/api/me/join-requests/request-1',
    '@type': 'JoinRequest',
    id: 'request-1',
    organizationId: 'org-1',
    organizationName: 'Fireguard Operations',
    status: 'pending',
    createdAt: '2026-09-22T10:00:00Z',
    expiresAt: '2026-10-22T10:00:00Z',
    actions: ['cancel'],
  };
  const workspace = {
    optionsCallState: signal<CallState<OrganizationJoinOptionsOutput>>(idleCallState()),
    options: signal<OrganizationJoinOptionsOutput | null>(null),
    loading: signal(false),
    busy: signal(false),
    challengeCallState: signal<CallState<EmailOwnershipChallengeOutput>>(idleCallState()),
    confirmCallState: signal<CallState<EmailOwnershipOutput>>(idleCallState()),
    requestCallState: signal<CallState<OrganizationJoinRequestOutput>>(idleCallState()),
    cancelCallState: signal<CallState<OrganizationJoinRequestOutput>>(idleCallState()),
    createCallState: signal<CallState<object>>(idleCallState()),
    admissionCallState: signal<CallState<OrganizationAdmissionOutput>>(idleCallState()),
    load: vi.fn(),
    admit: vi.fn(),
    request: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn(),
    startProof: vi.fn(),
    confirmProof: vi.fn(),
  };
  const onboarding = { clear: vi.fn(), targetOrganizationId: signal<string | null>(null) };
  const notifications = { revision: signal(0), connectMercure: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    workspace.options.set(null);
    workspace.optionsCallState.set(idleCallState());
    workspace.loading.set(false);
    workspace.busy.set(false);
    workspace.challengeCallState.set(idleCallState());
    workspace.confirmCallState.set(idleCallState());
    workspace.requestCallState.set(idleCallState());
    workspace.cancelCallState.set(idleCallState());
    workspace.createCallState.set(idleCallState());
    workspace.admissionCallState.set(idleCallState());
    onboarding.targetOrganizationId.set(null);
    notifications.revision.set(0);
  });

  /**
   * Function renderPage
   * @description Renders page orchestration with store-owned commands and safe route context.
   * @access private
   * @since 1.0.0
   * @param {string} returnUrl - Requested post-admission destination.
   * @param {boolean} requestsOnly - Whether the route shows only request history.
   * @returns {Promise<ComponentFixture<OnboardingWorkspacePage>>} Stable rendered page.
   */
  async function renderPage(
    returnUrl = '',
    requestsOnly = false,
  ): Promise<ComponentFixture<OnboardingWorkspacePage>> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OnboardingStore, useValue: onboarding },
        { provide: NOTIFICATION_CENTER_PORT, useValue: notifications },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { requestsOnly }, queryParamMap: convertToParamMap({ returnUrl }) },
          },
        },
      ],
    });
    TestBed.overrideComponent(OnboardingWorkspacePage, {
      set: { providers: [{ provide: WorkspaceStore, useValue: workspace }] },
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OnboardingWorkspacePage);
    await fixture.whenStable();
    return fixture;
  }

  it('loads private choices after rendering and refreshes only when notification revision increases', async () => {
    const fixture = await renderPage();

    expect(workspace.load).toHaveBeenCalledOnce();
    expect(notifications.connectMercure).toHaveBeenCalledOnce();
    notifications.revision.set(1);
    await fixture.whenStable();
    expect(workspace.load).toHaveBeenCalledTimes(2);
    notifications.revision.set(0);
    await fixture.whenStable();
    expect(workspace.load).toHaveBeenCalledTimes(2);
    expect(workspace.create).not.toHaveBeenCalled();
    expect(workspace.admit).not.toHaveBeenCalled();
  });

  it('preserves invitation intent when explicit creation is confirmed by the server', async () => {
    const destination = '/organizations/invitations/accept?token=invitation';
    const fixture = await renderPage(destination);
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((item) => item.textContent?.includes('Create an organization'));
    expect(button).toBeDefined();
    button?.click();
    expect(workspace.create).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();

    workspace.createCallState.set(successCallState({ state: 'in_progress' }));
    await fixture.whenStable();

    expect(onboarding.clear).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/onboarding/create'], {
      queryParams: { returnUrl: destination },
    });
  });

  it.each([
    [
      '/organizations/org-1/equipments?filter=overdue',
      '/organizations/org-1/equipments?filter=overdue',
    ],
    ['/organizations/org-1?tab=overview', '/organizations/org-1?tab=overview'],
    ['/organizations/org-10/equipments', '/organizations/org-1'],
    ['https://external.example/redirect', '/organizations/org-1'],
  ])(
    'navigates only within the admitted organization for destination %s',
    async (destination, expected) => {
      const fixture = await renderPage(destination);
      expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
      workspace.admissionCallState.set(
        successCallState({ '@id': '/admission', '@type': 'Admission', organizationId: 'org-1' }),
      );
      await fixture.whenStable();

      expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith(expected, {
        replaceUrl: true,
      });
    },
  );

  it('opens an already accessible workspace and clears obsolete creation state', async () => {
    workspace.options.set({
      ...emptyOptions,
      organizations: [
        {
          '@id': '/org-1',
          '@type': 'JoinOption',
          id: 'org-1',
          name: 'Operations',
          domain: 'example.com',
          actions: ['open'],
        },
      ],
    });
    const fixture = await renderPage('/organizations/org-1');
    const open = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (item) => item.textContent?.includes('Open workspace'),
    );
    expect(open).toBeDefined();
    open?.click();

    expect(onboarding.clear).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/organizations/org-1');
    expect(workspace.admit).not.toHaveBeenCalled();
  });

  it('renders request lifecycle labels and delegates cancellation without granting access', async () => {
    workspace.options.set({
      ...emptyOptions,
      requests: [
        request,
        { ...request, id: 'request-2', status: 'approved', actions: ['open'] },
        { ...request, id: 'request-3', status: 'rejected', actions: [] },
        { ...request, id: 'request-4', status: 'cancelled', actions: [] },
        { ...request, id: 'request-5', status: 'expired', actions: [] },
      ],
    });
    const fixture = await renderPage('', true);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Your membership requests');
    for (const label of ['Awaiting approval', 'Approved', 'Declined', 'Cancelled', 'Expired']) {
      expect(host.textContent).toContain(label);
    }
    const cancel = Array.from(host.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Cancel request'),
    );
    expect(cancel).toBeDefined();
    cancel?.click();
    expect(workspace.cancel).toHaveBeenCalledWith('request-1');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
  });

  it('renders the no-request state without exposing unrelated discovery actions', async () => {
    workspace.options.set(emptyOptions);
    const fixture = await renderPage('', true);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('You have no membership requests.');
    expect(host.querySelector('#workspace-organizations-title')).toBeNull();
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/onboarding/workspace');
  });

  it('binds the replacement mailbox challenge and delegates OTP confirmation to the store', async () => {
    workspace.options.set({ ...emptyOptions, emailProofRequired: true });
    const fixture = await renderPage();
    const send = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (item) => item.textContent?.includes('Send verification code'),
    );
    expect(send).toBeDefined();
    send?.click();
    expect(workspace.startProof).toHaveBeenCalledOnce();

    workspace.challengeCallState.set(
      successCallState({
        '@id': '/proof',
        '@type': 'EmailOwnershipChallenge',
        challengeToken: 'challenge-1',
        canResendIn: 0,
      }),
    );
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(OtpForm));
    const instance = form.componentInstance as OtpForm;
    expect(instance.challengeKey()).toBe('challenge-1');
    form.triggerEventHandler('submitted', { code: '123456' });
    expect(workspace.confirmProof).toHaveBeenCalledWith('123456');
    form.triggerEventHandler('resent');
    expect(workspace.startProof).toHaveBeenCalledTimes(2);

    workspace.confirmCallState.set(
      successCallState({ '@id': '/proof', '@type': 'EmailOwnership', verified: true }),
    );
    workspace.challengeCallState.set(idleCallState());
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Your workspace',
    );
  });
});
