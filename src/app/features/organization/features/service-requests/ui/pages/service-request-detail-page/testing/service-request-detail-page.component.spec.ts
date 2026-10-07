import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type { ServiceRequestOutput } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { ServiceRequestEditorSheet } from '../../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';
import { ServiceRequestDetailPage } from '../service-request-detail-page.component';

describe('ServiceRequestDetailPage', () => {
  const read = ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ;
  const manage = ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE;
  const plan = ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN;

  /**
   * Function render
   *
   * @description
   * Builds a page with real stores while keeping the editor as an input/output boundary.
   */
  async function render(
    request = serviceRequestFixture(),
    options: {
      readonly platform?: string;
      readonly permissions?: readonly string[];
      readonly response?: Observable<ServiceRequestOutput>;
      readonly openWork?: readonly EquipmentOpenWorkOutput[];
    } = {},
  ) {
    const permissions = signal<ReadonlySet<string>>(
      new Set(options.permissions ?? [read, manage, plan]),
    );
    const online = signal(true);
    const api = {
      list: vi.fn(),
      get: vi.fn().mockReturnValue(options.response ?? of(request)),
      create: vi.fn(),
      update: vi.fn().mockReturnValue(of(request)),
      qualify: vi.fn().mockReturnValue(of(request)),
      reject: vi.fn().mockReturnValue(of(request)),
      cancel: vi.fn().mockReturnValue(of(request)),
      convert: vi.fn().mockReturnValue(of(request)),
    };
    const equipment = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listByFacility: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      get: vi.fn(),
      openWork: vi
        .fn()
        .mockReturnValue(
          of({ member: options.openWork ?? [], totalItems: options.openWork?.length ?? 0 }),
        ),
    };
    const facilities = {
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      get: vi.fn(),
    };
    const types = {
      listAll: vi.fn().mockReturnValue(of([])),
      list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
    };
    TestBed.configureTestingModule({
      imports: [ServiceRequestDetailPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        { provide: ServiceRequestService, useValue: api },
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: types },
        { provide: FacilityService, useValue: facilities },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: ConnectivityService, useValue: { isOnline: online } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => permissions().has(permission) },
        },
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
    TestBed.overrideComponent(ServiceRequestEditorSheet, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(ServiceRequestDetailPage);
    fixture.componentRef.setInput('organizationId', request.organizationId);
    fixture.componentRef.setInput('requestId', request.id);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const sheet = fixture.debugElement.query(By.directive(ServiceRequestEditorSheet))
      .componentInstance as ServiceRequestEditorSheet;
    const button = (label: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].find(
        (candidate) => candidate.textContent?.trim() === label,
      );
    return {
      fixture,
      element,
      sheet,
      api,
      equipment,
      facilities,
      types,
      permissions,
      online,
      button,
    };
  }

  it('does not request authenticated detail or picker data during SSR', async () => {
    const page = await render(serviceRequestFixture(), {
      platform: 'server',
      permissions: [
        read,
        manage,
        plan,
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
        ORGANIZATION_PERMISSION.FACILITIES_READ,
      ],
    });
    expect(page.api.get).not.toHaveBeenCalled();
    expect(page.equipment.list).not.toHaveBeenCalled();
    expect(page.equipment.get).not.toHaveBeenCalled();
    expect(page.equipment.openWork).not.toHaveBeenCalled();
    expect(page.facilities.list).not.toHaveBeenCalled();
    expect(page.types.listAll).not.toHaveBeenCalled();
    expect(page.sheet.visible()).toBe(false);
  });

  it('does not turn create permission into detail management permission', async () => {
    const page = await render(serviceRequestFixture(), {
      permissions: [read, ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE],
    });
    expect(page.api.get).toHaveBeenCalledWith('org', 'request');
    expect(page.button('Edit')).toBeUndefined();
    expect(page.element.querySelector('[data-testid="service-request-qualify"]')).toBeNull();
    expect(page.button('Reject request')).toBeUndefined();
    expect(page.button('Cancel request')).toBeUndefined();
  });

  it('permits qualification for a manager but requires planning permission for conversion', async () => {
    const page = await render(serviceRequestFixture(), { permissions: [read, manage] });
    expect(page.element.querySelector('[data-testid="service-request-qualify"]')).not.toBeNull();
    page.api.get.mockReturnValue(
      of(serviceRequestFixture({ id: 'qualified-request', status: 'qualified', revision: 2 })),
    );
    page.fixture.componentRef.setInput('requestId', 'qualified-request');
    await page.fixture.whenStable();
    expect(page.element.querySelector('[data-testid="service-request-convert"]')).toBeNull();
    page.permissions.set(new Set([read, manage, plan]));
    await page.fixture.whenStable();
    expect(page.element.querySelector('[data-testid="service-request-convert"]')).not.toBeNull();
  });

  it('keeps reported identity visible while gating every dossier link by its read permission', async () => {
    const request = serviceRequestFixture({
      status: 'converted',
      interventionId: 'work',
      taskId: 'task',
      originInspectionId: 'inspection',
    });
    const page = await render(request, { permissions: [read] });
    expect(page.element.textContent).toContain('Extinguisher A');
    expect(page.element.textContent).toContain('Hospital operator');
    const hrefs = () =>
      [...page.element.querySelectorAll<HTMLAnchorElement>('a')].map((anchor) =>
        anchor.getAttribute('href'),
      );
    expect(hrefs()).not.toContain('/organizations/org/equipments/equipment');
    expect(hrefs()).not.toContain('/organizations/org/facilities/site');
    expect(hrefs()).not.toContain('/organizations/org/inspections/inspection');
    expect(hrefs().some((href) => href?.startsWith('/organizations/org/interventions/work'))).toBe(
      false,
    );
    page.permissions.set(
      new Set([
        read,
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
        ORGANIZATION_PERMISSION.FACILITIES_READ,
        ORGANIZATION_PERMISSION.INSPECTION_READ,
        ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ]),
    );
    await page.fixture.whenStable();
    expect(hrefs()).toContain('/organizations/org/equipments/equipment');
    expect(hrefs()).toContain('/organizations/org/facilities/site');
    expect(hrefs()).toContain('/organizations/org/inspections/inspection');
    expect(hrefs()).toContain(
      '/organizations/org/interventions/work?targetEquipment=equipment&workAction=repair',
    );
  });

  it('keeps the old edit revision after 412 and after refresh until explicit acceptance', async () => {
    const original = serviceRequestFixture();
    const latest = serviceRequestFixture({ revision: 7, title: 'Server revision' });
    const page = await render(original);
    const draft = {
      title: 'My retained draft',
      description: 'Repair the damaged gauge.',
      priority: 'high' as const,
      equipmentId: 'equipment',
    };
    page.api.update.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 412, error: { detail: 'Review the current version.' } }),
      ),
    );
    page.button('Edit')?.click();
    await page.fixture.whenStable();
    page.sheet.descriptionSubmitted.emit(draft);
    await page.fixture.whenStable();
    expect(page.sheet.conflict()).toBe(true);
    expect(page.sheet.request()?.revision).toBe(1);
    expect(page.api.get).toHaveBeenCalledTimes(1);
    page.api.get.mockReturnValue(of(latest));
    page.sheet.refreshRequested.emit();
    await page.fixture.whenStable();
    expect(page.sheet.latestRequest()?.revision).toBe(7);
    expect(page.sheet.request()?.revision).toBe(1);
    expect(page.sheet.conflict()).toBe(true);
    expect(page.sheet.visible()).toBe(true);
    page.sheet.descriptionSubmitted.emit(draft);
    await page.fixture.whenStable();
    expect(page.api.update).toHaveBeenLastCalledWith('org', original, {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
    });
    page.sheet.revisionAccepted.emit();
    await page.fixture.whenStable();
    expect(page.sheet.request()?.revision).toBe(7);
    expect(page.sheet.conflict()).toBe(false);
    page.sheet.descriptionSubmitted.emit(draft);
    await page.fixture.whenStable();
    expect(page.api.update).toHaveBeenLastCalledWith('org', latest, {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
    });
  });

  it('does not adopt a reviewed terminal revision for an edit that is no longer allowed', async () => {
    const page = await render();
    page.api.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 412 })));
    page.button('Edit')?.click();
    await page.fixture.whenStable();
    page.sheet.descriptionSubmitted.emit({
      title: 'Draft',
      description: 'Still needed',
      equipmentId: 'equipment',
    });
    await page.fixture.whenStable();
    page.api.get.mockReturnValue(
      of(
        serviceRequestFixture({
          status: 'converted',
          revision: 3,
          interventionId: 'work',
          taskId: 'task',
        }),
      ),
    );
    page.sheet.refreshRequested.emit();
    await page.fixture.whenStable();
    expect(page.sheet.canAcceptRevision()).toBe(false);
    page.sheet.revisionAccepted.emit();
    await page.fixture.whenStable();
    expect(page.sheet.request()?.revision).toBe(1);
    expect(page.sheet.conflict()).toBe(true);
  });

  it('offers API-shaped planned repairs and converts using the retained task instead of creating new work', async () => {
    const repair: EquipmentOpenWorkOutput = {
      '@id': '/api/intervention-work-items/existing-task',
      '@type': 'EquipmentOpenWork',
      interventionId: 'existing-intervention',
      workItemId: 'existing-task',
      name: 'Planned gauge repair',
      number: 42,
      status: 'planned',
      action: 'repair',
      workItemStatus: 'planned',
    };
    const request = serviceRequestFixture({ status: 'qualified', revision: 2 });
    const page = await render(request, {
      permissions: [
        read,
        manage,
        plan,
        ORGANIZATION_PERMISSION.EQUIPMENT_READ,
        ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ],
      openWork: [
        repair,
        { ...repair, workItemId: 'finished', workItemStatus: 'completed' },
        { ...repair, workItemId: 'control', action: 'inspect' },
      ],
    });
    (
      page.element.querySelector('[data-testid="service-request-convert"]') as HTMLButtonElement
    ).click();
    await page.fixture.whenStable();
    expect(page.sheet.openWork()).toEqual([repair]);
    page.sheet.actionSubmitted.emit({ kind: 'convert', existingWork: repair });
    await page.fixture.whenStable();
    expect(page.api.convert).toHaveBeenCalledOnce();
    expect(page.api.convert).toHaveBeenCalledWith('org', request, {
      clientOperationId: expect.any(String),
      existingInterventionId: 'existing-intervention',
      existingTaskId: 'existing-task',
    });
  });

  it('checks planning rights again when the conversion editor emits its action', async () => {
    const page = await render(serviceRequestFixture({ status: 'qualified', revision: 2 }));
    (
      page.element.querySelector('[data-testid="service-request-convert"]') as HTMLButtonElement
    ).click();
    await page.fixture.whenStable();
    expect(page.sheet.visible()).toBe(true);
    page.permissions.set(new Set([read, manage]));
    await page.fixture.whenStable();
    page.sheet.actionSubmitted.emit({ kind: 'convert', existingWork: null });
    await page.fixture.whenStable();
    expect(page.api.convert).not.toHaveBeenCalled();
  });

  it('cancels obsolete route reads and leaves old target responses out of the page', async () => {
    const old = new Subject<ServiceRequestOutput>();
    const page = await render(serviceRequestFixture(), { response: old });
    const current = serviceRequestFixture({ id: 'other', title: 'Current request' });
    page.api.get.mockReturnValue(of(current));
    page.fixture.componentRef.setInput('requestId', 'other');
    await page.fixture.whenStable();
    expect(old.observed).toBe(false);
    old.next(serviceRequestFixture({ title: 'Obsolete request' }));
    await page.fixture.whenStable();
    expect(page.element.textContent).toContain('Current request');
    expect(page.element.textContent).not.toContain('Obsolete request');
    expect(page.api.get).toHaveBeenLastCalledWith('org', 'other');
  });

  it('replays the retained conversion after planning rights are revoked but still requires management rights', async () => {
    const page = await render(serviceRequestFixture({ status: 'qualified', revision: 2 }));
    page.api.convert.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    (
      page.element.querySelector('[data-testid="service-request-convert"]') as HTMLButtonElement
    ).click();
    await page.fixture.whenStable();
    page.sheet.actionSubmitted.emit({ kind: 'convert', existingWork: null });
    await page.fixture.whenStable();
    expect(page.sheet.uncertain()).toBe(true);
    expect(page.api.convert).toHaveBeenCalledTimes(1);
    const originalCommand = page.api.convert.mock.calls[0];
    page.permissions.set(new Set([read, manage]));
    await page.fixture.whenStable();
    page.sheet.retryConversionRequested.emit();
    await page.fixture.whenStable();
    expect(page.api.convert).toHaveBeenCalledTimes(2);
    expect(page.api.convert.mock.calls[1]).toEqual(originalCommand);
    page.permissions.set(new Set([read]));
    await page.fixture.whenStable();
    page.sheet.retryConversionRequested.emit();
    await page.fixture.whenStable();
    expect(page.api.convert).toHaveBeenCalledTimes(2);
    expect(page.sheet.uncertain()).toBe(true);
  });

  it('lets an accepted old write finish without restoring its editor in a new route scope', async () => {
    const page = await render();
    const accepted = new Subject<ServiceRequestOutput>();
    page.api.qualify.mockReturnValue(accepted);
    (
      page.element.querySelector('[data-testid="service-request-qualify"]') as HTMLButtonElement
    ).click();
    await page.fixture.whenStable();
    page.sheet.actionSubmitted.emit({ kind: 'qualify', input: { note: 'Inspect first.' } });
    await page.fixture.whenStable();
    expect(accepted.observed).toBe(true);
    page.api.get.mockReturnValue(
      of(serviceRequestFixture({ id: 'other', title: 'Current request' })),
    );
    page.fixture.componentRef.setInput('requestId', 'other');
    await page.fixture.whenStable();
    expect(accepted.observed).toBe(true);
    accepted.next(serviceRequestFixture({ status: 'qualified', revision: 2 }));
    accepted.complete();
    await page.fixture.whenStable();
    expect(page.element.textContent).toContain('Current request');
    expect(page.sheet.visible()).toBe(false);
    expect(page.sheet.request()).toBeNull();
  });
});
