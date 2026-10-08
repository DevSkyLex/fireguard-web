import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import {
  ServiceRequestActionForm,
  type ServiceRequestActionIntent,
} from '../service-request-action-form.component';
describe('ServiceRequestActionForm', () => {
  let fixture: ComponentFixture<ServiceRequestActionForm>;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ServiceRequestActionForm],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: EquipmentService, useValue: {} },
        { provide: EquipmentTypeService, useValue: {} },
        { provide: FacilityService, useValue: {} },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
      ],
    });
    fixture = TestBed.createComponent(ServiceRequestActionForm);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('request', serviceRequestFixture({ equipmentId: null }));
    fixture.componentRef.setInput('kind', 'qualify');
    await fixture.whenStable();
  });
  const submit = async (): Promise<void> => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  };
  it('requires an explicit equipment for a site-only qualification and emits its trimmed note', async () => {
    const emitted: ServiceRequestActionIntent[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await submit();
    expect(emitted).toEqual([]);
    fixture.componentInstance['actionForm'].equipmentId().value.set('equipment');
    fixture.componentInstance['actionForm'].note().value.set(' Repair the gauge ');
    await submit();
    expect(emitted).toEqual([
      { kind: 'qualify', input: { equipmentId: 'equipment', note: 'Repair the gauge' } },
    ]);
  });
  it('never resends a replacement equipment identity for an already targeted request', async () => {
    fixture.componentRef.setInput('request', serviceRequestFixture({ id: 'targeted' }));
    await fixture.whenStable();
    const emitted: ServiceRequestActionIntent[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await submit();
    expect(emitted).toEqual([{ kind: 'qualify', input: { note: null } }]);
  });
  it('requires a motivated decision and retains its draft after a stale server revision', async () => {
    fixture.componentRef.setInput('kind', 'reject');
    await fixture.whenStable();
    const emitted: ServiceRequestActionIntent[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    fixture.componentInstance['actionForm'].reason().value.set('  ');
    await submit();
    expect(emitted).toEqual([]);
    fixture.componentInstance['actionForm'].reason().value.set(' Already resolved ');
    fixture.componentInstance['actionForm'].reason().markAsDirty();
    fixture.componentRef.setInput('error', toStoreError(new HttpErrorResponse({ status: 412 })));
    fixture.componentRef.setInput('request', serviceRequestFixture({ revision: 9 }));
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([{ kind: 'reject', input: { reason: 'Already resolved' } }]);
  });
  it('selects a real existing repair task and blocks conversion while its open-work read is unresolved', async () => {
    const work: EquipmentOpenWorkOutput = {
      '@id': 'work',
      '@type': 'OpenWork',
      interventionId: 'intervention',
      workItemId: 'task',
      name: 'Gauge repair',
      status: 'planned',
      action: 'repair',
      workItemStatus: 'planned',
    };
    fixture.componentRef.setInput('kind', 'convert');
    fixture.componentRef.setInput('openWork', [work]);
    await fixture.whenStable();
    const emitted: ServiceRequestActionIntent[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    fixture.componentInstance['pickWork']('task');
    fixture.componentRef.setInput('workPending', true);
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);
    fixture.componentRef.setInput('workPending', false);
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([{ kind: 'convert', existingWork: work }]);
  });
  it('locks an uncertain conversion without announcing an active request or allowing a new submission', async () => {
    fixture.componentRef.setInput('kind', 'convert');
    fixture.componentRef.setInput('locked', true);
    await fixture.whenStable();
    const emitted: ServiceRequestActionIntent[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    const submitButton = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent?.trim()).toBe('Create corrective intervention');
    expect(fixture.nativeElement.querySelector('hlm-spinner')).toBeNull();
    await submit();
    expect(emitted).toEqual([]);
  });
});
