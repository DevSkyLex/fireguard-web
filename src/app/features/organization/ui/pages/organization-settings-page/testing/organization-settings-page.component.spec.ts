import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PageTabsService } from '@core/page-tabs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import { ApprovalRequestService } from '@features/organization/features/approvals/data-access';
import {
  ORGANIZATION_PERMISSION,
  type CurrentOrganizationMemberProfileOutput,
  type OrganizationMemberOutput,
  type OrganizationOutput,
} from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
  OrganizationQuotaStore,
} from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationPlanSelector } from '../../../components/organization-plan-selector';
import { OrganizationSettingsPage } from '../organization-settings-page.component';

@Component({
  selector: 'app-page-tabs-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageTabsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

function organization(overrides: Partial<OrganizationOutput> = {}): OrganizationOutput {
  return {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    description: 'A widget factory.',
    logoUrl: null,
    memberCount: 3,
    planId: 'plan-pro',
    planName: 'Pro',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as unknown as OrganizationOutput;
}

function member(overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput {
  return {
    '@id': '/api/organizations/org-1/members/member-2',
    '@type': 'OrganizationMember',
    id: 'member-2',
    organizationId: 'org-1',
    userId: 'user-2',
    displayName: 'Jane Doe',
    isActive: true,
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  } as unknown as OrganizationMemberOutput;
}

describe('OrganizationSettingsPage', () => {
  let fixture: ComponentFixture<OrganizationSettingsPage>;
  let tabsFixture: ComponentFixture<PageTabsHost> | null;
  let selectedOrganization: WritableSignal<OrganizationOutput | null>;
  let deleteCallState: WritableSignal<CallState<void>>;
  let statusCallState: WritableSignal<CallState<OrganizationOutput>>;
  let transferOwnershipCallState: WritableSignal<CallState<OrganizationOutput>>;
  let cancelCallState: WritableSignal<CallState<unknown>>;
  let subscription: WritableSignal<{ hasSubscription: boolean; cancelAtPeriodEnd: boolean } | null>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let actingProfile: WritableSignal<CurrentOrganizationMemberProfileOutput | null>;
  let navigate: ReturnType<typeof vi.fn>;
  let clearActiveOrganization: ReturnType<typeof vi.fn>;

  let save: ReturnType<typeof vi.fn>;
  let uploadLogo: ReturnType<typeof vi.fn>;
  let deleteOrganization: ReturnType<typeof vi.fn>;
  let suspend: ReturnType<typeof vi.fn>;
  let restore: ReturnType<typeof vi.fn>;
  let transferOwnership: ReturnType<typeof vi.fn>;

  let loadSubscription: ReturnType<typeof vi.fn>;
  let loadPricing: ReturnType<typeof vi.fn>;
  let loadInvoices: ReturnType<typeof vi.fn>;
  let startCheckout: ReturnType<typeof vi.fn>;
  let startPortal: ReturnType<typeof vi.fn>;
  let cancelSubscription: ReturnType<typeof vi.fn>;
  let resumeSubscription: ReturnType<typeof vi.fn>;

  let listAllMembers: ReturnType<typeof vi.fn>;
  let listLegalTypes: ReturnType<typeof vi.fn>;

  const renderPageTabs = (): HTMLElement => {
    tabsFixture ??= TestBed.createComponent(PageTabsHost);
    tabsFixture.componentRef.setInput('template', TestBed.inject(PageTabsService).tabs());
    tabsFixture.detectChanges();

    return tabsFixture.nativeElement as HTMLElement;
  };

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`) ??
    renderPageTabs().querySelector(`[data-testid="${id}"]`);

  /**
   * Builds the page, having first swapped `OrganizationPlanSelector`'s own
   * `OrganizationPlanStore` for a stub — that self-contained widget owns a
   * real transport this page-boundary spec has no business reaching.
   */
  async function createPage(tab?: string): Promise<void> {
    tabsFixture = null;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (name: string): boolean => permissions().includes(name),
          },
        },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization,
            selectedOrganizationId: signal('org-1'),
            clear: clearActiveOrganization,
          },
        },
        {
          provide: OrganizationQuotaStore,
          useValue: { items: signal([]), isLoadingQuota: signal(false) },
        },
        {
          provide: ApprovalRequestService,
          useValue: { listActionTypes: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { profile: actingProfile },
        },
        {
          provide: OrganizationMemberService,
          useValue: { listAll: listAllMembers },
        },
        {
          provide: OrganizationService,
          useValue: { listLegalTypes },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationSettingsPage, {
      remove: { providers: [OrganizationSettingsStore, OrganizationBillingStore] },
      add: {
        providers: [
          {
            provide: OrganizationSettingsStore,
            useValue: {
              isSaving: signal(false),
              saveError: signal<StoreError | null>(null),
              isUploadingLogo: signal(false),
              uploadLogoError: signal<StoreError | null>(null),
              isRemovingLogo: signal(false),
              removeLogoError: signal<StoreError | null>(null),
              removeLogo: vi.fn(),
              isDeleting: signal(false),
              deleteError: signal<StoreError | null>(null),
              deleteCallState,
              save,
              uploadLogo,
              deleteOrganization,
              isChangingStatus: signal(false),
              statusError: signal<StoreError | null>(null),
              statusCallState,
              suspend,
              restore,
              isTransferringOwnership: signal(false),
              transferOwnershipError: signal<StoreError | null>(null),
              transferOwnershipCallState,
              transferOwnership,
            },
          },
          {
            provide: OrganizationBillingStore,
            useValue: {
              subscription,
              isLoadingSubscription: signal(false),
              pricing: signal([]),
              isLoadingPricing: signal(false),
              invoices: signal([]),
              isLoadingInvoices: signal(false),
              invoicesError: signal<StoreError | null>(null),
              isStartingCheckout: signal(false),
              isStartingPortal: signal(false),
              isCanceling: signal(false),
              isResuming: signal(false),
              cancelCallState,
              billingError: signal<StoreError | null>(null),
              loadSubscription,
              loadPricing,
              loadInvoices,
              startCheckout,
              startPortal,
              cancelSubscription,
              resumeSubscription,
            },
          },
        ],
      },
    });

    TestBed.overrideComponent(OrganizationPlanSelector, {
      remove: { providers: [OrganizationPlanStore] },
      add: {
        providers: [
          {
            provide: OrganizationPlanStore,
            useValue: {
              plans: signal([]),
              isLoadingPlans: signal(false),
              plansError: signal<StoreError | null>(null),
              isChangingPlan: signal(false),
              changePlanError: signal<StoreError | null>(null),
              changePlanSucceeded: signal(false),
              loadPlans: vi.fn(),
              changePlan: vi.fn(),
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;

    fixture = TestBed.createComponent(OrganizationSettingsPage);
    if (tab !== undefined) fixture.componentRef.setInput('tab', tab);
    await fixture.whenStable();
  }

  beforeEach(() => {
    selectedOrganization = signal<OrganizationOutput | null>(organization());
    deleteCallState = signal<CallState<void>>(idleCallState());
    statusCallState = signal<CallState<OrganizationOutput>>(idleCallState());
    transferOwnershipCallState = signal<CallState<OrganizationOutput>>(idleCallState());
    cancelCallState = signal<CallState<unknown>>(idleCallState());
    subscription = signal<{ hasSubscription: boolean; cancelAtPeriodEnd: boolean } | null>(null);
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.DELETE]);
    actingProfile = signal<CurrentOrganizationMemberProfileOutput | null>({
      id: 'member-1',
      organizationId: 'org-1',
      userId: 'user-2',
      isActive: true,
      joinedAt: '2026-01-01T00:00:00+00:00',
      roles: [],
      permissions: [],
    } as unknown as CurrentOrganizationMemberProfileOutput);
    clearActiveOrganization = vi.fn();
    save = vi.fn();
    uploadLogo = vi.fn();
    deleteOrganization = vi.fn();
    suspend = vi.fn();
    restore = vi.fn();
    transferOwnership = vi.fn();
    loadSubscription = vi.fn();
    loadPricing = vi.fn();
    loadInvoices = vi.fn();
    startCheckout = vi.fn();
    startPortal = vi.fn();
    cancelSubscription = vi.fn();
    resumeSubscription = vi.fn();
    listAllMembers = vi.fn().mockReturnValue(of([]));
    listLegalTypes = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should show a loading skeleton instead of the tabs before the organization has landed', async () => {
    selectedOrganization.set(null);
    await createPage();

    expect(fixture.nativeElement.querySelector('hlm-tabs')).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
  });

  it('should default to the general tab for a missing or unrecognized ?tab=', async () => {
    await createPage('not-a-real-tab');

    expect(fixture.componentInstance['activeTab']()).toBe('general');
  });

  it('should not expose the assistant policy as an operator settings tab', async () => {
    await createPage('assistant');

    expect(fixture.componentInstance['activeTab']()).toBe('general');
    expect(byTestId('org-settings-tab-assistant')).toBeNull();
  });

  it('should fall back from the danger tab when the member holds no delete permission', async () => {
    permissions.set([]);
    await createPage('danger');

    expect(fixture.componentInstance['activeTab']()).toBe('general');
    expect(byTestId('org-settings-tab-danger')).toBeNull();
  });

  it('should keep the danger tab for a member holding organization.delete', async () => {
    await createPage('danger');

    expect(fixture.componentInstance['activeTab']()).toBe('danger');
    expect(byTestId('org-settings-tab-danger')).not.toBeNull();
  });

  it('should show an icon ahead of every tab label', async () => {
    await createPage();

    for (const tabId of [
      'general',
      'subscription',
      'usage',
      'notifications',
      'regional',
      'compliance',
    ]) {
      expect(byTestId(`org-settings-tab-${tabId}`)?.querySelector('ng-icon')).not.toBeNull();
    }
  });

  it('should give the danger tab trigger icon the destructive tint, keeping its label neutral', async () => {
    await createPage('danger');

    const dangerTrigger: HTMLElement | null = byTestId('org-settings-tab-danger');
    const dangerIcon: Element | null | undefined = dangerTrigger?.querySelector('ng-icon');

    expect(dangerIcon?.className).toContain('text-destructive');
    expect(dangerTrigger?.className).not.toContain('text-destructive');
    expect(dangerTrigger?.textContent).toContain('Danger zone');
  });

  it('should project the settings sections as native line tabs in the page header', async () => {
    await createPage();

    expect(fixture.nativeElement.querySelector('hlm-tabs-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-paginated-tabs-list')).toBeNull();
    expect(renderPageTabs().querySelector('hlm-paginated-tabs-list')).not.toBeNull();
    expect(renderPageTabs().querySelector('[data-variant="line"]')).not.toBeNull();
  });

  it('should let every settings panel fill the available content width', async () => {
    await createPage();

    for (const tabId of [
      'general',
      'subscription',
      'usage',
      'notifications',
      'regional',
      'compliance',
    ]) {
      const content: HTMLElement | null = fixture.nativeElement.querySelector(
        `[hlmtabscontent="${tabId}"]`,
      );

      expect(content?.className).toContain('w-full');
      expect(content?.className).toContain('min-w-0');
      expect(content?.className).not.toContain('max-w-');
    }
  });

  it('should render the current-plan section as a card', async () => {
    await createPage('subscription');

    const trigger: HTMLElement = byTestId('org-settings-billing-checkout') as HTMLElement;
    const card: HTMLElement | null = trigger.closest('[hlmCard], [data-slot="card"]');

    expect(card).not.toBeNull();
  });

  it('should render the danger zone as a card', async () => {
    await createPage('danger');

    const trigger: HTMLElement = byTestId('org-settings-danger-open') as HTMLElement;
    const card: HTMLElement | null = trigger.closest('[hlmCard], [data-slot="card"]');

    expect(card).not.toBeNull();
  });

  it('should write a picked tab back onto the ?tab= query parameter', async () => {
    await createPage();

    fixture.componentInstance['onTabActivated']('notifications');

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { tab: 'notifications' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('should lazy-load subscription data only once the subscription tab is opened', async () => {
    await createPage();
    expect(loadSubscription).not.toHaveBeenCalled();

    fixture.componentRef.setInput('tab', 'subscription');
    await fixture.whenStable();

    expect(loadSubscription).toHaveBeenCalledWith('org-1');
    expect(loadPricing).toHaveBeenCalled();
    expect(loadInvoices).toHaveBeenCalledWith('org-1');
  });

  it('should not reload subscription data on a second visit to the tab', async () => {
    await createPage('subscription');
    expect(loadSubscription).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('tab', 'general');
    await fixture.whenStable();
    fixture.componentRef.setInput('tab', 'subscription');
    await fixture.whenStable();

    expect(loadSubscription).toHaveBeenCalledTimes(1);
  });

  it('should save the general form scoped to the active organization, clearing an emptied description to null', async () => {
    await createPage();

    fixture.componentInstance['saveGeneral']({ name: 'Renamed', slug: 'renamed', description: '' });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { name: 'Renamed', slug: 'renamed', description: null },
    });
  });

  it('should save the compliance form scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['saveCompliance']({
      nonConformitySlaDays: { low: 60, medium: 30, high: 7, critical: 1 },
      inspectionPeriodicityDefaults: { fire_extinguisher: 'P1Y' },
      reminderWindowDays: 45,
    });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        compliance: {
          nonConformitySlaDays: { low: 60, medium: 30, high: 7, critical: 1 },
          inspectionPeriodicityDefaults: { fire_extinguisher: 'P1Y' },
          reminderWindowDays: 45,
        },
      },
    });
  });

  it('should save the notifications form, weeklyDigest included, scoped to the active organization', async () => {
    await createPage();

    const notifications = {
      emailEnabled: true,
      inAppEnabled: true,
      interventionPublished: true,
      interventionAssigned: true,
      inspectionDue: true,
      nonConformityOpened: true,
      nonConformitySlaBreached: true,
      weeklyDigest: false,
      memberInvited: true,
    };

    fixture.componentInstance['saveNotifications'](notifications);

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { notifications },
    });
  });

  it('should save the automation form scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['saveAutomation']({ autoCreateInterventionOnCriticalNc: true });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { automation: { autoCreateInterventionOnCriticalNc: true } },
    });
  });

  it('should default the compliance, automation and approval seeds for an organization with no settings', async () => {
    selectedOrganization.set(organization({ settings: undefined }));
    await createPage();

    expect(fixture.componentInstance['complianceSeed']().reminderWindowDays).toBe(30);
    expect(fixture.componentInstance['automationSeed']()).toEqual({
      autoCreateInterventionOnCriticalNc: false,
    });
    expect(fixture.componentInstance['approvalSeed']()).toEqual({
      actionRules: {},
      allowSelfApproval: false,
      approvalTtlDays: 14,
    });
  });

  it('should send a picked logo scoped to the active organization', async () => {
    await createPage();
    const file = new File(['data'], 'logo.png', { type: 'image/png' });

    fixture.componentInstance['uploadLogo'](file);

    expect(uploadLogo).toHaveBeenCalledWith({
      organizationId: 'org-1',
      file,
      fileName: 'logo.png',
    });
  });

  it('should start a recovery checkout only once a current plan key has resolved', async () => {
    await createPage();
    fixture.componentInstance['startCheckout']();
    expect(startCheckout).not.toHaveBeenCalled();

    fixture.componentInstance['onCurrentPlanKeyChange']('plan-pro');
    fixture.componentInstance['startCheckout']();

    expect(startCheckout).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planKey: 'plan-pro',
      interval: 'month',
    });
  });

  it('should start a billing portal session scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['startPortal']();

    expect(startPortal).toHaveBeenCalledWith('org-1');
  });

  it('should clear the active organization and leave once deletion transitions into success', async () => {
    await createPage('danger');
    fixture.componentInstance['openDeleteDialog']();
    fixture.componentInstance['deleteOrganization']();
    expect(deleteOrganization).toHaveBeenCalledWith({
      organizationId: 'org-1',
      slug: 'acme-corp',
    });

    deleteCallState.set(pendingCallState());
    await fixture.whenStable();
    deleteCallState.set(successCallState(undefined));
    await fixture.whenStable();

    expect(clearActiveOrganization).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations']);
    expect(fixture.componentInstance['confirmingDelete']()).toBe(false);
  });

  it('should save the legal information section scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['saveLegal']({
      country: 'FR',
      legalType: 'limited_liability_company',
      legalName: 'Fireguard Paris SARL',
      registrationNumber: 'RCS PARIS 812345678',
      vatNumber: 'FR12345678901',
    });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        country: 'FR',
        legalType: 'limited_liability_company',
        legalName: 'Fireguard Paris SARL',
        registrationNumber: 'RCS PARIS 812345678',
        vatNumber: 'FR12345678901',
      },
    });
  });

  it('should load the legal type catalog once the general tab opens', async () => {
    await createPage();

    expect(listLegalTypes).toHaveBeenCalled();
  });

  it('should show Suspend but not Restore for an active organization', async () => {
    await createPage('danger');

    expect(byTestId('org-settings-danger-suspend-open')).not.toBeNull();
    expect(byTestId('org-settings-danger-restore')).toBeNull();
  });

  it('should show Restore but not Suspend for a suspended organization', async () => {
    selectedOrganization.set(organization({ status: 'suspended' }));
    await createPage('danger');

    expect(byTestId('org-settings-danger-suspend-open')).toBeNull();
    expect(byTestId('org-settings-danger-restore')).not.toBeNull();
  });

  it('should show Restore for an archived organization too', async () => {
    selectedOrganization.set(organization({ status: 'archived' }));
    await createPage('danger');

    expect(byTestId('org-settings-danger-restore')).not.toBeNull();
  });

  it('should suspend the active organization once confirmed', async () => {
    await createPage('danger');

    fixture.componentInstance['openSuspendDialog']();
    fixture.componentInstance['suspendOrganization']();

    expect(suspend).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('should close the suspend dialog once the status change succeeds', async () => {
    await createPage('danger');
    fixture.componentInstance['openSuspendDialog']();

    statusCallState.set(pendingCallState());
    await fixture.whenStable();
    statusCallState.set(successCallState(organization({ status: 'suspended' })));
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingSuspend']()).toBe(false);
  });

  it('should restore the organization directly, without a confirmation dialog', async () => {
    selectedOrganization.set(organization({ status: 'suspended' }));
    await createPage('danger');

    fixture.componentInstance['restoreOrganization']();

    expect(restore).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('should hide ownership transfer for a non-owner member', async () => {
    await createPage('danger');

    expect(byTestId('org-settings-danger-transfer-open')).toBeNull();
  });

  it('should offer ownership transfer once the API declares the caller owner', async () => {
    selectedOrganization.set(organization({ isOwner: true }));
    await createPage('danger');

    expect(byTestId('org-settings-danger-transfer-open')).not.toBeNull();
  });

  it('should not derive ownership from ownerUserId when the API declares the caller a plain member', async () => {
    actingProfile.set({
      id: 'member-1',
      organizationId: 'org-1',
      userId: 'user-1',
      isActive: true,
      joinedAt: '2026-01-01T00:00:00+00:00',
      roles: [],
      permissions: [],
    } as unknown as CurrentOrganizationMemberProfileOutput);
    selectedOrganization.set(organization({ ownerUserId: 'user-1', isOwner: false }));
    await createPage('danger');

    expect(byTestId('org-settings-danger-transfer-open')).toBeNull();
  });

  it('should hide ownership transfer for an archived organization even for the owner', async () => {
    selectedOrganization.set(organization({ status: 'archived', isOwner: true }));
    await createPage('danger');

    expect(byTestId('org-settings-danger-transfer-open')).toBeNull();
  });

  it('should load active, non-owner members as transfer candidates once the owner opens the danger tab', async () => {
    listAllMembers.mockReturnValue(
      of([
        member({ userId: 'user-1', isOwner: true, displayName: 'Acme Owner' }),
        member({ userId: 'user-2', isOwner: false, isActive: true, displayName: 'Jane Doe' }),
        member({ userId: 'user-3', isOwner: false, isActive: false, displayName: 'Inactive Roe' }),
      ]),
    );
    selectedOrganization.set(organization({ isOwner: true }));
    await createPage('danger');

    expect(listAllMembers).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance['transferCandidates']()).toEqual([
      expect.objectContaining({ value: 'user-2', label: 'Jane Doe', displayName: 'Jane Doe' }),
    ]);
  });

  it('should transfer ownership to the picked candidate, reading the slug from the resolved organization', async () => {
    selectedOrganization.set(organization({ isOwner: true }));
    await createPage('danger');

    fixture.componentInstance['openTransferDialog']();
    fixture.componentInstance['transferOwnership']({ newOwnerUserId: 'user-2' });

    expect(transferOwnership).toHaveBeenCalledWith({
      organizationId: 'org-1',
      newOwnerUserId: 'user-2',
      slug: 'acme-corp',
    });
  });

  it('should close the transfer dialog once the transfer succeeds', async () => {
    selectedOrganization.set(organization({ isOwner: true }));
    await createPage('danger');
    fixture.componentInstance['openTransferDialog']();

    transferOwnershipCallState.set(pendingCallState());
    await fixture.whenStable();
    transferOwnershipCallState.set(successCallState(organization({ ownerUserId: 'user-2' })));
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingTransfer']()).toBe(false);
  });

  it('should offer Cancel when a subscription renews normally', async () => {
    subscription.set({ hasSubscription: true, cancelAtPeriodEnd: false });
    await createPage('subscription');

    expect(byTestId('org-settings-subscription-cancel')).not.toBeNull();
    expect(byTestId('org-settings-subscription-resume')).toBeNull();
  });

  it('should offer Resume once the subscription is scheduled to cancel', async () => {
    subscription.set({ hasSubscription: true, cancelAtPeriodEnd: true });
    await createPage('subscription');

    expect(byTestId('org-settings-subscription-resume')).not.toBeNull();
    expect(byTestId('org-settings-subscription-cancel')).toBeNull();
  });

  it('should offer neither control without an active subscription', async () => {
    await createPage('subscription');

    expect(byTestId('org-settings-subscription-cancel')).toBeNull();
    expect(byTestId('org-settings-subscription-resume')).toBeNull();
  });

  it('should cancel the active subscription once confirmed', async () => {
    await createPage('subscription');

    fixture.componentInstance['openCancelSubscriptionDialog']();
    fixture.componentInstance['cancelSubscription']();

    expect(cancelSubscription).toHaveBeenCalledWith('org-1');
  });

  it('should close the cancel dialog once the cancellation succeeds', async () => {
    await createPage('subscription');
    fixture.componentInstance['openCancelSubscriptionDialog']();

    cancelCallState.set(pendingCallState());
    await fixture.whenStable();
    cancelCallState.set(successCallState({}));
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingCancelSubscription']()).toBe(false);
  });

  it('should resume a subscription directly, without a confirmation dialog', async () => {
    await createPage('subscription');

    fixture.componentInstance['resumeSubscription']();

    expect(resumeSubscription).toHaveBeenCalledWith('org-1');
  });
});
