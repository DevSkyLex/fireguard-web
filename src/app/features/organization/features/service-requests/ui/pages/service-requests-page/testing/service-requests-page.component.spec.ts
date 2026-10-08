import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  getDebugNode,
  signal,
  type DebugElement,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  NavigationCancel,
  NavigationEnd,
  provideRouter,
  Router,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { idleCallState } from '@core/request-state';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type { ServiceRequestOutput } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { SERVICE_REQUEST_ROUTES } from '@features/organization/features/service-requests/service-requests.routes';
import {
  ServiceRequestStore,
  serviceRequestStoreEvents,
} from '@features/organization/features/service-requests/state';
import { serviceRequestContext } from '@features/organization/features/service-requests/state/service-request/testing/service-request-context.fixture';
import { ServiceRequestEquipmentPicker } from '@features/organization/features/service-requests/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { CollectionPagination } from '@shared/collection-pagination';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { ServiceRequestForm } from '../../../forms/service-request-form/service-request-form.component';
import { ServiceRequestEditorSheet } from '../../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';
import { ServiceRequestsPage } from '../service-requests-page.component';

@Component({ template: 'Previous page', changeDetection: ChangeDetectionStrategy.OnPush })
class PreviousPage {}

describe('ServiceRequestsPage', () => {
  const read = ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ;
  const create = ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE;

  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  /**
   * Function render
   *
   * @description
   * Provides real query/write stores while observing the page's editor bindings separately.
   */
  async function render(
    options: {
      readonly platform?: string;
      readonly permissions?: readonly string[];
      readonly response?: Observable<HydraCollection<ServiceRequestOutput>>;
      readonly equipmentId?: string;
      readonly siteId?: string;
      readonly mobile?: boolean;
      readonly routed?: boolean;
      readonly realEditor?: boolean;
    } = {},
  ) {
    const permissions = signal<ReadonlySet<string>>(new Set(options.permissions ?? [read, create]));
    const context = serviceRequestContext(computed(() => [...permissions()]));
    if (options.platform === 'server') context.journal.browser = false;
    const mobile = signal(options.mobile ?? false);
    const request = serviceRequestFixture();
    const api = {
      list: vi.fn().mockReturnValue(options.response ?? of({ member: [request], totalItems: 61 })),
      get: vi.fn(),
      create: vi.fn().mockReturnValue(of(request)),
      update: vi.fn(),
      qualify: vi.fn(),
      reject: vi.fn(),
      cancel: vi.fn(),
      convert: vi.fn(),
    };
    const equipment = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listByFacility: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      get: vi.fn(),
      openWork: vi.fn(),
    };
    const facilities = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      get: vi.fn(),
    };
    const types = { list: vi.fn(), listAll: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [ServiceRequestsPage],
      providers: [
        provideRouter(
          options.routed
            ? [
                { path: 'before', component: PreviousPage },
                {
                  path: 'organizations/:organizationId/service-requests',
                  children: SERVICE_REQUEST_ROUTES,
                },
              ]
            : [],
          withComponentInputBinding(),
        ),
        provideLocationMocks(),
        ...context.providers,
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        { provide: ServiceRequestService, useValue: api },
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: types },
        { provide: FacilityService, useValue: facilities },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: FeedbackService, useValue: { warn: vi.fn() } },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { ensureAccessResolved: () => of(undefined) },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string) => permissions().has(permission),
            canAccessOrganization: () => true,
          },
        },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            interactionMode: signal('desktop'),
            shortcutModifier: signal('Control'),
          },
        },
      ],
    });
    if (!options.realEditor)
      TestBed.overrideComponent(ServiceRequestEditorSheet, { set: { template: '', imports: [] } });
    const harness = options.routed ? await RouterTestingHarness.create('/before') : null;
    if (harness) TestBed.inject(Router).setUpLocationChangeListener();
    const routedPage = harness
      ? await harness.navigateByUrl(
          '/organizations/org/service-requests?create=1',
          ServiceRequestsPage,
        )
      : null;
    const fixture = harness?.fixture ?? TestBed.createComponent(ServiceRequestsPage);
    if (!harness) {
      fixture.componentRef.setInput('organizationId', 'org');
      fixture.componentRef.setInput('equipmentId', options.equipmentId ?? '');
      fixture.componentRef.setInput('siteId', options.siteId ?? '');
    }
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    if (!options.routed) navigate.mockResolvedValue(true);
    await fixture.whenStable();
    const element = (harness?.routeNativeElement ?? fixture.nativeElement) as HTMLElement;
    return {
      fixture,
      element,
      get sheet(): ServiceRequestEditorSheet {
        return (harness?.routeDebugElement ?? fixture.debugElement).query(
          By.directive(ServiceRequestEditorSheet),
        ).componentInstance as ServiceRequestEditorSheet;
      },
      api,
      equipment,
      facilities,
      types,
      permissions,
      mobile,
      navigate,
      context,
      harness,
      page: routedPage,
    };
  }

  it('keeps secondary collections and target selectors browser-only even with permissions during SSR', async () => {
    const page = await render({ platform: 'server' });
    expect(page.api.list).not.toHaveBeenCalled();
    expect(page.equipment.list).not.toHaveBeenCalled();
    expect(page.facilities.list).not.toHaveBeenCalled();
    expect(page.types.listAll).not.toHaveBeenCalled();
    expect(page.sheet.visible()).toBe(false);
  });

  it('announces directory loading until the requested page arrives', async () => {
    const response = new Subject<HydraCollection<ServiceRequestOutput>>();
    const page = await render({ response });
    expect(
      page.element.querySelector('[data-testid="service-requests-loading"] .sr-only')?.textContent,
    ).toBe('Loading…');
    response.next({ '@id': 'requests', '@type': 'Collection', member: [], totalItems: 0 });
    await page.fixture.whenStable();
    expect(page.element.querySelector('[data-testid="service-requests-loading"]')).toBeNull();
  });

  it('lets a creator submit without reading the collection or navigating to an unauthorized detail', async () => {
    const page = await render({ permissions: [create] });
    expect(page.api.list).not.toHaveBeenCalled();
    const open = page.element.querySelector<HTMLButtonElement>(
      '[data-testid="service-request-new"]',
    );
    expect(open).not.toBeNull();
    open?.click();
    await page.fixture.whenStable();
    expect(page.sheet.visible()).toBe(true);
    const input = {
      title: 'Repair damaged gauge',
      description: 'The pressure gauge is damaged.',
      equipmentId: 'equipment',
    };
    page.sheet.descriptionSubmitted.emit(input);
    await page.fixture.whenStable();
    expect(page.api.create).toHaveBeenCalledWith('org', input);
    expect(page.sheet.visible()).toBe(false);
    const result = page.element.querySelector('output');
    expect(result?.textContent).toContain('Maintenance request submitted: Repair damaged gauge');
    expect(result?.getAttribute('role')).toBeNull();
    expect(page.navigate).not.toHaveBeenCalled();
  });

  it('does not grant creation to managers or accept unauthorized editor output', async () => {
    const page = await render({
      permissions: [read, ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE],
    });
    expect(page.element.querySelector('[data-testid="service-request-new"]')).toBeNull();
    page.sheet.descriptionSubmitted.emit({
      title: 'Forged editor intent',
      description: 'Should not be sent.',
      equipmentId: 'equipment',
    });
    await page.fixture.whenStable();
    expect(page.api.create).not.toHaveBeenCalled();
  });

  it('forwards route target, status, search and page while resetting pagination for changed filters', async () => {
    const page = await render({ equipmentId: 'equipment', siteId: 'site' });
    expect(page.api.list).toHaveBeenLastCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: '',
      params: { equipmentId: 'equipment', siteId: 'site' },
    });
    const pagination = page.fixture.debugElement.query(By.directive(CollectionPagination))
      .componentInstance as CollectionPagination;
    pagination.pageChanged.emit(2);
    await page.fixture.whenStable();
    expect(page.api.list).toHaveBeenLastCalledWith('org', expect.objectContaining({ page: 2 }));
    const input = page.element.querySelector<HTMLInputElement>('input[type="search"]');
    expect(input).not.toBeNull();
    if (!input) throw new Error('Search input is missing.');
    input.value = 'broken';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await page.fixture.whenStable();
    expect(page.api.list).toHaveBeenLastCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: 'broken',
      params: { equipmentId: 'equipment', siteId: 'site' },
    });
    const qualified = [...page.element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Qualified',
    );
    expect(qualified).toBeDefined();
    qualified?.click();
    await page.fixture.whenStable();
    expect(page.api.list).toHaveBeenLastCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: 'broken',
      params: { equipmentId: 'equipment', siteId: 'site', status: 'qualified' },
    });
  });

  it('ignores a saved event belonging to another organization', async () => {
    const page = await render();
    TestBed.inject(Dispatcher).dispatch(
      serviceRequestStoreEvents.saved({
        organizationId: 'foreign',
        request: serviceRequestFixture({ organizationId: 'foreign', title: 'Foreign result' }),
        kind: 'create',
      }),
    );
    await page.fixture.whenStable();
    expect(page.navigate).not.toHaveBeenCalled();
    expect(page.element.textContent).not.toContain('Foreign result');
  });

  it('cancels previous organization reads when route scope changes', async () => {
    const old = new Subject<HydraCollection<ServiceRequestOutput>>();
    const page = await render({ response: old, equipmentId: 'old-equipment' });
    const current = serviceRequestFixture({
      organizationId: 'other',
      id: 'other-request',
      title: 'Current organization request',
    });
    page.api.list.mockReturnValue(of({ member: [current], totalItems: 1 }));
    const profile = page.context.profile();
    if (!profile) throw new Error('The current member fixture is missing.');
    page.context.profile.set({ ...profile, organizationId: 'other' });
    page.fixture.componentRef.setInput('organizationId', 'other');
    page.fixture.componentRef.setInput('equipmentId', 'other-equipment');
    await page.fixture.whenStable();
    expect(old.observed).toBe(false);
    old.next({
      '@id': 'old',
      '@type': 'Collection',
      member: [serviceRequestFixture({ title: 'Obsolete organization result' })],
      totalItems: 1,
    });
    await page.fixture.whenStable();
    expect(page.api.list).toHaveBeenLastCalledWith(
      'other',
      expect.objectContaining({ params: { equipmentId: 'other-equipment' } }),
    );
    expect(page.element.textContent).toContain('Current organization request');
    expect(page.element.textContent).not.toContain('Obsolete organization result');
    expect(page.sheet.visible()).toBe(false);
  });

  it('uses the mobile interaction mode for request cards without another server query', async () => {
    const page = await render();
    expect(page.element.querySelector('[data-testid="service-request-table"]')).not.toBeNull();
    const calls = page.api.list.mock.calls.length;
    page.mobile.set(true);
    await page.fixture.whenStable();
    expect(page.element.querySelector('[data-testid="service-request-cards"]')).not.toBeNull();
    expect(page.element.querySelector('[data-testid="service-request-table"]')).toBeNull();
    expect(page.element.textContent).toContain('Repair damaged gauge');
    expect(page.api.list).toHaveBeenCalledTimes(calls);
  });

  it.each(['actor', 'session'] as const)(
    'destroys the old typed editor when the same organization replaces its %s with equal permissions',
    async (replacement) => {
      const rendered = await render({ routed: true, realEditor: true });
      const oldSheet = rendered.sheet;
      const oldForm = document.querySelector<HTMLElement>('app-service-request-form');
      const oldTitle = oldForm?.querySelector<HTMLInputElement>('#service-request-title');
      if (!oldForm || !oldTitle) throw new Error('The prior actor form is missing.');
      oldTitle.value = 'Private draft from the previous session';
      oldTitle.dispatchEvent(new Event('input', { bubbles: true }));
      await rendered.fixture.whenStable();
      expect(oldSheet.hasDirty()).toBe(true);
      const grants = [...rendered.permissions()];
      if (replacement === 'actor') {
        const profile = rendered.context.profile();
        if (!profile) throw new Error('The member identity fixture is missing.');
        rendered.context.profile.set({ ...profile, userId: 'new-actor' });
      } else rendered.context.revision.update((revision) => revision + 1);
      await rendered.fixture.whenStable();
      expect([...rendered.permissions()]).toEqual(grants);
      expect(rendered.harness?.routeDebugElement?.componentInstance).toBe(rendered.page);
      expect(document.contains(oldForm)).toBe(false);
      expect(rendered.sheet).not.toBe(oldSheet);
      expect(document.querySelector<HTMLInputElement>('#service-request-title')?.value).toBe('');
      expect(rendered.sheet.hasDirty()).toBe(false);
      expect(rendered.api.create).not.toHaveBeenCalled();
    },
  );

  it('keeps a typed draft on browser Back until discard, then destroys the page and returns with a clean editor', async () => {
    const rendered = await render({ routed: true, realEditor: true });
    const harness = rendered.harness;
    const page = rendered.page;
    if (!harness || !page) throw new Error('The routed request page is missing.');
    const editor = document.querySelector<HTMLElement>('app-service-request-form');
    const title = editor?.querySelector<HTMLInputElement>('#service-request-title');
    if (!title) throw new Error('The routed request title is missing.');
    title.value = 'Keep this maintenance draft';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(rendered.sheet.hasDirty()).toBe(true);
    const router = TestBed.inject(Router);
    const terminal: Promise<NavigationEnd | NavigationCancel> = new Promise((resolve) => {
      const subscription = router.events.subscribe((event) => {
        if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
          subscription.unsubscribe();
          resolve(event);
        }
      });
    });
    TestBed.inject(Location).back();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(rendered.sheet['confirmation']()).toBe('open');
      expect(document.querySelector('[data-testid="unsaved-changes-dialog"]')).not.toBeNull();
    });
    expect(harness.routeDebugElement?.componentInstance).toBe(page);
    const cancel = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="unsaved-changes-dialog"] button',
      ),
    ].find((button) => button.textContent?.trim() === 'Cancel');
    if (!cancel) throw new Error('The draft confirmation cancel action is missing.');
    cancel.click();
    expect(await terminal).toBeInstanceOf(NavigationCancel);
    await harness.fixture.whenStable();
    expect(router.url).toBe('/organizations/org/service-requests?create=1');
    expect(harness.routeDebugElement?.componentInstance).toBe(page);
    expect(title.value).toBe('Keep this maintenance draft');
    const leaving = harness.navigateByUrl('/before', PreviousPage);
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="unsaved-changes-discard"]')).not.toBeNull(),
    );
    (
      document.querySelector('[data-testid="unsaved-changes-discard"]') as HTMLButtonElement
    ).click();
    await leaving;
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(PreviousPage);
    expect(document.querySelector('app-service-request-form')).toBeNull();
    const returned = await harness.navigateByUrl(
      '/organizations/org/service-requests?create=1',
      ServiceRequestsPage,
    );
    await harness.fixture.whenStable();
    expect(returned).not.toBe(page);
    const restoredTitle = document.querySelector<HTMLInputElement>('#service-request-title');
    expect(restoredTitle?.value).toBe('');
    expect(rendered.api.create).not.toHaveBeenCalled();
  });

  it('allows confirmed creation navigation before the closed sheet input has rendered', async () => {
    const rendered = await render();
    const page = rendered.fixture.componentInstance as ServiceRequestsPage;
    (
      rendered.element.querySelector('[data-testid="service-request-new"]') as HTMLButtonElement
    ).click();
    await rendered.fixture.whenStable();
    rendered.sheet['dirty'].set(true);
    rendered.navigate.mockImplementationOnce(() => {
      expect(rendered.sheet.visible()).toBe(true);
      expect(rendered.sheet.hasDirty()).toBe(true);
      expect(page.canLeaveDraft()).toBe(true);
      return Promise.resolve(true);
    });
    rendered.sheet.descriptionSubmitted.emit({
      title: 'Repair',
      description: 'Damaged gauge',
      equipmentId: 'equipment',
    });
    await rendered.fixture.whenStable();
    expect(rendered.navigate).toHaveBeenCalledExactlyOnceWith([
      '/organizations',
      'org',
      'service-requests',
      'request',
    ]);
    expect(rendered.sheet['confirmation']()).toBe('closed');
  });

  it('blocks route leave while an accepted creation remains pending', async () => {
    const rendered = await render();
    const pending = new Subject<ServiceRequestOutput>();
    rendered.api.create.mockReturnValue(pending);
    (
      rendered.element.querySelector('[data-testid="service-request-new"]') as HTMLButtonElement
    ).click();
    await rendered.fixture.whenStable();
    rendered.sheet.descriptionSubmitted.emit({
      title: 'Repair',
      description: 'Damaged gauge',
      equipmentId: 'equipment',
    });
    await rendered.fixture.whenStable();
    expect((rendered.fixture.componentInstance as ServiceRequestsPage).canLeaveDraft()).toBe(false);
    expect(pending.observed).toBe(true);
  });

  it('normalizes missing router-bound target inputs before opening the real editor and submitting a site-only request', async () => {
    const site: FacilityOutput = {
      '@id': '/api/organizations/org/facilities/site',
      '@type': 'Facility',
      id: 'site',
      organizationId: 'org',
      parentFacilityId: null,
      hasChildren: false,
      type: 'site',
      name: 'Hospital',
      code: null,
      status: 'active',
      address: null,
      metadata: {},
      path: [],
      equipmentCount: 0,
      recordStatus: 'published',
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z',
    };
    const store = {
      listCallState: signal(idleCallState()),
      writeCallState: signal(idleCallState()),
      requestEntities: signal<readonly ServiceRequestOutput[]>([]),
      query: signal(null),
      pageCount: signal(1),
      total: signal(0),
      load: vi.fn(),
      write: vi.fn(),
      clearWrite: vi.fn(),
      commandsReady: signal(true),
      commandCallState: signal(idleCallState()),
      restoreCommands: vi.fn(),
      activateCommands: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ServiceRequestsPage],
      providers: [
        provideRouter(
          [
            {
              path: 'organizations/:organizationId/service-requests',
              component: ServiceRequestsPage,
            },
          ],
          withComponentInputBinding(),
        ),
        ...serviceRequestContext().providers,
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: EquipmentService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            listByFacility: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            get: vi.fn(),
          },
        },
        {
          provide: EquipmentTypeService,
          useValue: { listAll: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: FacilityService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [site], totalItems: 1 })),
            get: vi.fn().mockReturnValue(of(site)),
          },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: signal(false),
            interactionMode: signal('desktop'),
            shortcutModifier: signal('Control'),
          },
        },
      ],
    });
    TestBed.overrideComponent(ServiceRequestsPage, {
      remove: { providers: [ServiceRequestStore] },
      add: { providers: [{ provide: ServiceRequestStore, useValue: store }] },
    });
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/organizations/org/service-requests?create=1',
      ServiceRequestsPage,
    );
    await harness.fixture.whenStable();
    expect(page.organizationId()).toBe('org');
    expect(page.equipmentId()).toBeUndefined();
    expect(page.siteId()).toBeUndefined();
    const sheet = harness.routeDebugElement?.query(By.directive(ServiceRequestEditorSheet))
      .componentInstance as ServiceRequestEditorSheet;
    expect(sheet.visible()).toBe(true);
    expect(sheet.initialEquipmentId()).toBe('');
    expect(sheet.initialSiteId()).toBe('');
    const formElement = document.querySelector<HTMLElement>('app-service-request-form');
    expect(formElement).not.toBeNull();
    if (!formElement) throw new Error('The routed editor form is missing.');
    const form = (getDebugNode(formElement) as DebugElement)
      .componentInstance as ServiceRequestForm;
    expect(form.initialEquipmentId()).toBe('');
    expect(form.initialSiteId()).toBe('');
    const facilityElement = formElement.querySelector<HTMLElement>('app-facility-option-picker');
    const equipmentElement = formElement.querySelector<HTMLElement>(
      'app-service-request-equipment-picker',
    );
    expect(facilityElement).not.toBeNull();
    expect(equipmentElement).not.toBeNull();
    if (!facilityElement || !equipmentElement)
      throw new Error('A routed target picker is missing.');
    const facilityPicker = (getDebugNode(facilityElement) as DebugElement)
      .componentInstance as FacilityOptionPicker;
    const equipmentPicker = (getDebugNode(equipmentElement) as DebugElement)
      .componentInstance as ServiceRequestEquipmentPicker;
    expect(facilityPicker.value()).toBe('');
    expect(equipmentPicker.value()).toBe('');
    facilityPicker.value.set(site.id);
    for (const [selector, value] of [
      ['#service-request-title', ' Repair '],
      ['#service-request-description', ' Damaged gauge '],
    ]) {
      const input = formElement.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error('A routed description field is missing.');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await harness.fixture.whenStable();
    formElement
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(store.write).toHaveBeenCalledExactlyOnceWith({
      kind: 'create',
      organizationId: 'org',
      input: {
        title: 'Repair',
        description: 'Damaged gauge',
        priority: 'normal',
        equipmentId: null,
        siteId: site.id,
        originInspectionId: null,
        originNonConformityId: null,
      },
    });
  });
});
