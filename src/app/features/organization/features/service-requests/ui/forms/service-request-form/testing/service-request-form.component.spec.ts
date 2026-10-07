import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { toStoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityOptionPicker } from '@features/organization/features/facilities/ui/components';
import type { CreateServiceRequestInput } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import {
  ServiceRequestEquipmentPicker,
  ServiceRequestSitePicker,
} from '@features/organization/features/service-requests/ui/components';
import { ServiceRequestForm } from '../service-request-form.component';
describe('ServiceRequestForm', () => {
  let fixture: ComponentFixture<ServiceRequestForm>;
  let equipment: {
    list: ReturnType<typeof vi.fn>;
    listByFacility: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let facilities: { list: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  const site: FacilityOutput = {
    '@id': '/api/organizations/org/facilities/site',
    '@type': 'Facility',
    id: 'site',
    organizationId: 'org',
    parentFacilityId: null,
    hasChildren: false,
    type: 'site',
    name: 'Hospital',
    code: 'HOSPITAL',
    status: 'active',
    address: null,
    metadata: {},
    path: [],
    equipmentCount: 1,
    recordStatus: 'published',
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  const secondSite: FacilityOutput = { ...site, id: 'second-site', name: 'Annex' };
  const extinguisher: EquipmentOutput = {
    '@id': '/api/organizations/org/equipment/equipment',
    '@type': 'Equipment',
    id: 'equipment',
    organizationId: 'org',
    facilityId: site.id,
    facilityName: site.name,
    type: 'fire_extinguisher',
    subType: null,
    name: 'Extinguisher A',
    brand: null,
    model: null,
    serialNumber: null,
    locationLabel: null,
    status: 'operational',
    recordStatus: 'published',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(async () => {
    equipment = {
      list: vi.fn().mockReturnValue(of({ member: [extinguisher], totalItems: 1 })),
      listByFacility: vi.fn().mockReturnValue(of({ member: [extinguisher], totalItems: 1 })),
      get: vi.fn().mockReturnValue(of(extinguisher)),
    };
    facilities = {
      list: vi.fn().mockReturnValue(of({ member: [site, secondSite], totalItems: 2 })),
      get: vi
        .fn()
        .mockImplementation((_organizationId: string, siteId: string) =>
          of(siteId === secondSite.id ? secondSite : site),
        ),
    };
    TestBed.configureTestingModule({
      imports: [ServiceRequestForm],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: EquipmentService, useValue: equipment },
        { provide: EquipmentTypeService, useValue: { listAll: vi.fn().mockReturnValue(of([])) } },
        { provide: FacilityService, useValue: facilities },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
      ],
    });
    fixture = TestBed.createComponent(ServiceRequestForm);
    fixture.componentRef.setInput('organizationId', 'org');
    await fixture.whenStable();
  });
  const fill = async (selector: string, value: string): Promise<void> => {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  };
  it('requires a real target and nonblank description before emitting a normalized site-only request', async () => {
    const emitted: CreateServiceRequestInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await fill('#service-request-title', ' Gauge repair ');
    await fill('#service-request-description', '   ');
    await submit();
    expect(emitted).toEqual([]);
    await fill('#service-request-description', ' Damaged gauge ');
    await submit();
    expect(emitted).toEqual([]);
    const picker = fixture.debugElement.query(By.directive(FacilityOptionPicker))
      .componentInstance as FacilityOptionPicker;
    picker.value.set(site.id);
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(ServiceRequestSitePicker))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(ServiceRequestEquipmentPicker))).not.toBeNull();
    expect(
      (fixture.nativeElement.querySelector('#service-request-site') as HTMLInputElement).value,
    ).toBe(site.name);
    await submit();
    expect(emitted).toEqual([
      {
        title: 'Gauge repair',
        description: 'Damaged gauge',
        priority: 'normal',
        equipmentId: null,
        siteId: 'site',
        originInspectionId: null,
        originNonConformityId: null,
      },
    ]);
  });
  it('binds both real custom target controls and clears the equipment when the selected site changes', async () => {
    const emitted: CreateServiceRequestInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    const sitePicker = fixture.debugElement.query(By.directive(FacilityOptionPicker))
      .componentInstance as FacilityOptionPicker;
    const equipmentPicker = fixture.debugElement.query(By.directive(ServiceRequestEquipmentPicker))
      .componentInstance as ServiceRequestEquipmentPicker;
    expect(facilities.list).toHaveBeenCalledWith('org', {
      page: 1,
      itemsPerPage: 30,
      search: '',
      params: { rootsOnly: true },
    });
    sitePicker.value.set(site.id);
    await fixture.whenStable();
    equipmentPicker.value.set(extinguisher.id);
    await fixture.whenStable();
    await fill('#service-request-title', 'Repair');
    await fill('#service-request-description', 'Damaged gauge');
    await submit();
    expect(emitted).toEqual([
      {
        title: 'Repair',
        description: 'Damaged gauge',
        priority: 'normal',
        equipmentId: extinguisher.id,
        siteId: site.id,
        originInspectionId: null,
        originNonConformityId: null,
      },
    ]);
    expect(equipment.listByFacility).toHaveBeenLastCalledWith('org', site.id, {
      page: 1,
      itemsPerPage: 30,
      search: '',
      params: { includeDescendants: true },
    });
    sitePicker.value.set(secondSite.id);
    await fixture.whenStable();
    expect(equipmentPicker.value()).toBe('');
    await submit();
    expect(emitted[1]).toEqual({
      ...emitted[0],
      equipmentId: null,
      siteId: secondSite.id,
    });
    expect(equipment.listByFacility).toHaveBeenLastCalledWith('org', secondSite.id, {
      page: 1,
      itemsPerPage: 30,
      search: '',
      params: { includeDescendants: true },
    });
  });
  it('preserves an edited draft after server rejection and an explicitly reviewed revision refresh', async () => {
    fixture.componentRef.setInput('request', serviceRequestFixture());
    await fixture.whenStable();
    await fill('#service-request-title', 'My entered draft');
    fixture.componentRef.setInput('error', toStoreError(new HttpErrorResponse({ status: 412 })));
    fixture.componentRef.setInput(
      'request',
      serviceRequestFixture({ revision: 9, title: 'Server revision' }),
    );
    await fixture.whenStable();
    expect(
      (fixture.nativeElement.querySelector('#service-request-title') as HTMLInputElement).value,
    ).toBe('My entered draft');
    expect(fixture.componentInstance['requestForm']().dirty()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });
  it('does not erase the seeded equipment when the matching initial site is emitted by a custom control', async () => {
    fixture.componentRef.setInput('organizationId', 'other');
    fixture.componentRef.setInput('initialSiteId', 'site');
    fixture.componentRef.setInput('initialEquipmentId', 'equipment');
    await fixture.whenStable();
    fixture.componentInstance['siteChanged']('site');
    expect(fixture.componentInstance['requestForm'].equipmentId().value()).toBe('equipment');
    fixture.componentInstance['siteChanged']('different');
    expect(fixture.componentInstance['requestForm'].equipmentId().value()).toBe('');
  });
  it('blocks submissions while pending and validates both server length bounds', async () => {
    const emitted: CreateServiceRequestInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    fixture.componentInstance['requestForm'].equipmentId().value.set('equipment');
    await fill('#service-request-title', 'a'.repeat(161));
    await fill('#service-request-description', 'Valid description');
    await submit();
    expect(emitted).toEqual([]);
    await fill('#service-request-title', 'Repair');
    await fill('#service-request-description', 'a'.repeat(10001));
    await submit();
    expect(emitted).toEqual([]);
    await fill('#service-request-description', 'Valid description');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(emitted).toEqual([]);
  });
});
