import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import { serviceRequestDraftLeaveGuard } from '@features/organization/features/service-requests/http/guards';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { ServiceRequestStore } from '@features/organization/features/service-requests/state';
import { serviceRequestContext } from '@features/organization/features/service-requests/state/service-request/testing/service-request-context.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { ServiceRequestEditorSheet } from '../../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';
import { ServiceRequestDetailPage } from '../service-request-detail-page.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class OtherRoutePage {}

describe('ServiceRequestDetailPage', () => {
  it('destroys the routed page after an uncertain conversion and restores its exact UUID, revision and work choice on return', async () => {
    const original = serviceRequestFixture({ status: 'qualified', revision: 7 });
    const grants = signal<readonly string[]>([
      ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
      ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
    ]);
    const context = serviceRequestContext(grants);
    const api = {
      get: vi.fn().mockReturnValue(of(original)),
      convert: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 }))),
    };
    TestBed.configureTestingModule({
      providers: [
        ...context.providers,
        provideRouter(
          [
            {
              path: 'organizations/:organizationId/service-requests/:requestId',
              component: ServiceRequestDetailPage,
              canDeactivate: [serviceRequestDraftLeaveGuard],
            },
            { path: 'other', component: OtherRoutePage },
          ],
          withComponentInputBinding(),
        ),
        { provide: ServiceRequestService, useValue: api },
        { provide: EquipmentService, useValue: { list: vi.fn(), get: vi.fn(), openWork: vi.fn() } },
        { provide: EquipmentTypeService, useValue: { listAll: vi.fn() } },
        { provide: FacilityService, useValue: { list: vi.fn(), get: vi.fn() } },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
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
    const harness = await RouterTestingHarness.create();
    const first = await harness.navigateByUrl(
      '/organizations/org/service-requests/request',
      ServiceRequestDetailPage,
    );
    await harness.fixture.whenStable();
    const routed = harness.routeDebugElement;
    if (!routed) throw new Error('Missing routed request page');
    const originalStore = routed.injector.get(ServiceRequestStore);
    const destroyed = vi.fn();
    routed.injector.get(DestroyRef).onDestroy(destroyed);
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[data-testid="service-request-convert"]')
      ?.click();
    await harness.fixture.whenStable();
    const sheet = routed.query(By.directive(ServiceRequestEditorSheet))
      .componentInstance as ServiceRequestEditorSheet;
    sheet.actionSubmitted.emit({
      kind: 'convert',
      existingWork: {
        '@id': '/work',
        '@type': 'EquipmentOpenWork',
        interventionId: 'original-work',
        workItemId: 'original-task',
        name: 'Existing repair',
        number: 42,
        status: 'planned',
        action: 'repair',
        workItemStatus: 'planned',
      },
    });
    await vi.waitFor(() => expect(originalStore.conversionUncertain()).toBe(true));
    const firstCall = api.convert.mock.calls[0];
    expect(firstCall).toEqual([
      'org',
      original,
      {
        clientOperationId: expect.any(String),
        existingInterventionId: 'original-work',
        existingTaskId: 'original-task',
      },
    ]);
    await harness.navigateByUrl('/other', OtherRoutePage);
    expect(destroyed).toHaveBeenCalledOnce();
    expect(context.commands.size).toBe(1);
    api.get.mockReturnValue(of(serviceRequestFixture({ status: 'qualified', revision: 99 })));
    grants.set([
      ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ,
      ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE,
    ]);
    const returned = await harness.navigateByUrl(
      '/organizations/org/service-requests/request',
      ServiceRequestDetailPage,
    );
    await harness.fixture.whenStable();
    expect(returned).not.toBe(first);
    const returnedStore = harness.routeDebugElement?.injector.get(ServiceRequestStore);
    expect(returnedStore).not.toBe(originalStore);
    await vi.waitFor(() => expect(returnedStore?.conversionUncertain()).toBe(true));
    expect(api.convert).toHaveBeenCalledOnce();
    const retry = harness.routeNativeElement?.querySelector<HTMLButtonElement>(
      '[data-testid="service-request-conversion-recovery"] button',
    );
    expect(retry?.disabled).toBe(false);
    api.convert.mockReturnValue(
      of(
        serviceRequestFixture({
          status: 'converted',
          revision: 8,
          interventionId: 'original-work',
          taskId: 'original-task',
        }),
      ),
    );
    retry?.click();
    await vi.waitFor(() => expect(api.convert).toHaveBeenCalledTimes(2));
    expect(api.convert.mock.calls[1]).toEqual(firstCall);
    await vi.waitFor(() => expect(context.commands.size).toBe(0));
    expect(returnedStore?.readCallState().data?.interventionId).toBe('original-work');
  });
});
