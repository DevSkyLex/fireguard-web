import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION, type OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationPlanSelector } from '../../../components/organization-plan-selector';
import { OrganizationSettingsPage } from '../organization-settings-page.component';

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

describe('OrganizationSettingsPage', () => {
  let fixture: ComponentFixture<OrganizationSettingsPage>;
  let selectedOrganization: WritableSignal<OrganizationOutput | null>;
  let deleteCallState: WritableSignal<CallState<void>>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let navigate: ReturnType<typeof vi.fn>;
  let clearActiveOrganization: ReturnType<typeof vi.fn>;

  let save: ReturnType<typeof vi.fn>;
  let uploadLogo: ReturnType<typeof vi.fn>;
  let deleteOrganization: ReturnType<typeof vi.fn>;

  let loadSubscription: ReturnType<typeof vi.fn>;
  let loadPricing: ReturnType<typeof vi.fn>;
  let loadInvoices: ReturnType<typeof vi.fn>;
  let startCheckout: ReturnType<typeof vi.fn>;
  let startPortal: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  /**
   * Builds the page, having first swapped `OrganizationPlanSelector`'s own
   * `OrganizationPlanStore` for a stub — that self-contained widget owns a
   * real transport this page-boundary spec has no business reaching.
   */
  async function createPage(tab?: string): Promise<void> {
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
            },
          },
          {
            provide: OrganizationBillingStore,
            useValue: {
              subscription: signal(null),
              isLoadingSubscription: signal(false),
              pricing: signal([]),
              isLoadingPricing: signal(false),
              invoices: signal([]),
              isLoadingInvoices: signal(false),
              invoicesError: signal<StoreError | null>(null),
              isStartingCheckout: signal(false),
              isStartingPortal: signal(false),
              billingError: signal<StoreError | null>(null),
              loadSubscription,
              loadPricing,
              loadInvoices,
              startCheckout,
              startPortal,
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
    permissions = signal<ReadonlyArray<string>>([ORGANIZATION_PERMISSION.DELETE]);
    clearActiveOrganization = vi.fn();
    save = vi.fn();
    uploadLogo = vi.fn();
    deleteOrganization = vi.fn();
    loadSubscription = vi.fn();
    loadPricing = vi.fn();
    loadInvoices = vi.fn();
    startCheckout = vi.fn();
    startPortal = vi.fn();
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

  it('should fall back from the danger tab when the member cannot delete', async () => {
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
      'assistant',
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

  it('should collapse the section list to a paginated horizontal row below the lg rail breakpoint', async () => {
    await createPage();

    expect(fixture.nativeElement.querySelector('hlm-tabs-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-paginated-tabs-list')).not.toBeNull();
  });

  it('should share the same max-width across every tab, including subscription', async () => {
    await createPage();

    for (const tabId of [
      'general',
      'subscription',
      'usage',
      'notifications',
      'regional',
      'compliance',
      'assistant',
    ]) {
      const content: HTMLElement | null = fixture.nativeElement.querySelector(
        `[hlmtabscontent="${tabId}"]`,
      );

      expect(content?.className).toContain('max-w-3xl');
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

  it('should save the automation form scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['saveAutomation']({ autoCreateInterventionOnCriticalNc: true });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { automation: { autoCreateInterventionOnCriticalNc: true } },
    });
  });

  it('should save the assistant form scoped to the active organization', async () => {
    await createPage();

    fixture.componentInstance['saveAssistant']({
      enabled: true,
      temperature: 0.5,
      includeBusinessContext: false,
    });

    expect(save).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        assistant: { enabled: true, temperature: 0.5, includeBusinessContext: false },
      },
    });
  });

  it('should default the compliance, automation, approval and assistant seeds for an organization with no settings', async () => {
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
    expect(fixture.componentInstance['assistantSeed']()).toEqual({
      enabled: false,
      model: null,
      temperature: 0.2,
      includeBusinessContext: true,
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
});
