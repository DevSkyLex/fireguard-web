import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';

describe('intervention resource owner services', () => {
  let httpMock: HttpTestingController;
  let facilities: FacilityService;
  let equipment: EquipmentService;
  let inspections: InspectionService;
  const apiUrl = 'https://api.test.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FacilityService,
        EquipmentService,
        InspectionService,
        { provide: ENV_CONFIG, useValue: { apiUrl } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    facilities = TestBed.inject(FacilityService);
    equipment = TestBed.inject(EquipmentService);
    inspections = TestBed.inject(InspectionService);
  });

  afterEach(() => httpMock.verify());

  it('uses conditional canonical PUTs for offline resource creation', () => {
    facilities
      .createForIntervention('org-1', 'intervention-1', {
        clientId: 'facility-1',
        type: 'building',
        name: 'Building A',
      })
      .subscribe();
    equipment
      .createForIntervention('org-1', 'intervention-1', {
        clientId: 'equipment-1',
        type: 'fire_extinguisher',
      })
      .subscribe();
    inspections
      .createForIntervention('org-1', 'intervention-1', {
        clientId: 'inspection-1',
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-06-12T10:00:00+00:00',
        inspectorType: 'user',
        inspectorName: 'Agent',
      })
      .subscribe();

    for (const resource of [
      'facilities/facility-1',
      'equipment/equipment-1',
      'inspections/inspection-1',
    ]) {
      const request = httpMock.expectOne(`${apiUrl}/api/${resource}`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.headers.get('If-None-Match')).toBe('*');
      expect(request.request.body).toMatchObject({
        organization: '/api/organizations/org-1',
        intervention: '/api/interventions/intervention-1',
      });
      request.flush({});
    }
  });

  it('uploads evidence as multipart through the equipment owner', () => {
    const file = new Blob(['photo'], { type: 'image/jpeg' });

    equipment.uploadEvidence('equipment-1', file, 'photo.jpg').subscribe();

    const request = httpMock.expectOne(`${apiUrl}/api/media`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect((request.request.body as FormData).get('equipment')).toBe('/api/equipment/equipment-1');
    request.flush({});
  });
});
