import { PLATFORM_ID, getDebugNode, signal, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ConnectivityService } from '@core/connectivity';
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
import {
  ServiceRequestStore,
  serviceRequestStoreEvents,
} from '@features/organization/features/service-requests/state';
import { ServiceRequestEquipmentPicker } from '@features/organization/features/service-requests/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { ServiceRequestForm } from '../../../forms/service-request-form/service-request-form.component';
import { ServiceRequestEditorSheet } from '../../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';
import { ServiceRequestsPage } from '../service-requests-page.component';

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
    } = {},
  ) {
    const permissions = signal<ReadonlySet<string>>(new Set(options.permissions ?? [read, create]));
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
    const equipment = { list: vi.fn(), listByFacility: vi.fn(), get: vi.fn(), openWork: vi.fn() };
    const facilities = { list: vi.fn(), get: vi.fn() };
    const types = { list: vi.fn(), listAll: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ServiceRequestsPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        { provide: ServiceRequestService, useValue: api },
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: types },
        { provide: FacilityService, useValue: facilities },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => permissions().has(permission) },
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
    TestBed.overrideComponent(ServiceRequestEditorSheet, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(ServiceRequestsPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('equipmentId', options.equipmentId ?? '');
    fixture.componentRef.setInput('siteId', options.siteId ?? '');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const sheet = fixture.debugElement.query(By.directive(ServiceRequestEditorSheet))
      .componentInstance as ServiceRequestEditorSheet;
    return {
      fixture,
      element,
      sheet,
      api,
      equipment,
      facilities,
      types,
      permissions,
      mobile,
      navigate,
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
    expect(page.element.textContent).toContain(
      'Maintenance request submitted: Repair damaged gauge',
    );
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
