import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EquipmentService } from './equipment.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  EquipmentOutput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  AssignToFacilityInput,
  EquipmentAttachmentOutput,
  AddAttachmentInput,
  EquipmentTagOutput,
  AddTagInput,
} from '@core/models/equipment';
import type { HydraCollection, HydraItem, ApiError } from '@core/models/api';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const equipmentId = 'equipment-uuid-1';
  const equipmentBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/equipment`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EquipmentService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(EquipmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockEquipment: EquipmentOutput = {
    '@id': `/api/organizations/${orgId}/equipment/${equipmentId}`,
    '@type': 'Equipment',
    id: equipmentId,
    organizationId: orgId,
    facilityId: null,
    type: 'fire_extinguisher',
    subType: 'ABC',
    brand: 'Sicli',
    model: 'XL6',
    serialNumber: 'SN-001234',
    locationLabel: 'Corridor B2',
    status: 'in_stock',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockAttachment: EquipmentAttachmentOutput = {
    '@id': `/api/organizations/${orgId}/equipment/${equipmentId}/attachments/attach-uuid-1`,
    '@type': 'EquipmentAttachment',
    id: 'attach-uuid-1',
    equipmentId,
    fileName: 'datasheet.pdf',
    mimeType: 'application/pdf',
    size: 204800,
    label: 'Technical Datasheet',
    uploadedAt: '2026-03-01T10:00:00+00:00',
  };

  const mockTag: EquipmentTagOutput = {
    '@id': `/api/organizations/${orgId}/equipment/${equipmentId}/tags/tag-uuid-1`,
    '@type': 'EquipmentTag',
    id: 'tag-uuid-1',
    name: 'critical',
    organizationId: orgId,
  };

  const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
    '@context': '/api/contexts/Collection',
    '@id': equipmentBaseUrl,
    '@type': 'Collection',
    member: items,
    totalItems: items.length,
    view: { '@id': `${equipmentBaseUrl}?page=1`, '@type': 'hydra:PartialCollectionView' },
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return equipment collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toEqual([mockEquipment]);
        expect(response.totalItems).toBe(1);
      });

      const req = httpMock.expectOne(equipmentBaseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockEquipment]));
    });

    it('should send GET request with pagination options', () => {
      service.list(orgId, { page: 2, itemsPerPage: 25 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === equipmentBaseUrl);
      expect(req.request.params.get('page')).toBe('2');
      req.flush(mockCollection([]));
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return single equipment item', () => {
      service.get(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment).toEqual(mockEquipment);
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockEquipment);
    });

    it('should handle not found error', () => {
      service.get(orgId, 'nonexistent').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateEquipmentInput = {
      type: 'fire_extinguisher',
      brand: 'Sicli',
      model: 'XL6',
      serialNumber: 'SN-001234',
    };

    it('should send POST request and return created equipment', () => {
      service.create(orgId, input).subscribe((equipment) => {
        expect(equipment.type).toBe('fire_extinguisher');
        expect(equipment.status).toBe('in_stock');
      });

      const req = httpMock.expectOne(equipmentBaseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockEquipment);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const input: UpdateEquipmentInput = {
      locationLabel: 'Corridor C3',
    };

    it('should send PATCH request and return updated equipment', () => {
      const updated: EquipmentOutput = { ...mockEquipment, locationLabel: 'Corridor C3' };

      service.update(orgId, equipmentId, input).subscribe((equipment) => {
        expect(equipment.locationLabel).toBe('Corridor C3');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(updated);
    });
  });

  // ── assignToFacility ───────────────────────────────────────────────────────

  describe('assignToFacility', () => {
    const input: AssignToFacilityInput = {
      facilityId: 'facility-uuid-1',
    };

    it('should send POST request to assign equipment to facility', () => {
      const assigned: EquipmentOutput = { ...mockEquipment, facilityId: 'facility-uuid-1' };

      service.assignToFacility(orgId, equipmentId, input).subscribe((equipment) => {
        expect(equipment.facilityId).toBe('facility-uuid-1');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/assign`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(assigned);
    });
  });

  // ── unassignFromFacility ───────────────────────────────────────────────────

  describe('unassignFromFacility', () => {
    it('should send POST action request to unassign equipment from facility', () => {
      const unassigned: EquipmentOutput = { ...mockEquipment, facilityId: null };

      service.unassignFromFacility(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment.facilityId).toBeNull();
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/unassign`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush(unassigned);
    });
  });

  // ── commission ─────────────────────────────────────────────────────────────

  describe('commission', () => {
    it('should send POST action request to commission equipment', () => {
      const commissioned: EquipmentOutput = {
        ...mockEquipment,
        status: 'commissioned',
        commissionedAt: '2026-03-01T00:00:00+00:00',
      };

      service.commission(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment.status).toBe('commissioned');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/commission`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(commissioned);
    });
  });

  // ── decommission ───────────────────────────────────────────────────────────

  describe('decommission', () => {
    it('should send POST action request to decommission equipment', () => {
      const decommissioned: EquipmentOutput = { ...mockEquipment, status: 'decommissioned' };

      service.decommission(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment.status).toBe('decommissioned');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/decommission`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(decommissioned);
    });
  });

  // ── maintenance ────────────────────────────────────────────────────────────

  describe('maintenance', () => {
    it('should send POST action request to put equipment under maintenance', () => {
      const inMaintenance: EquipmentOutput = { ...mockEquipment, status: 'under_maintenance' };

      service.maintenance(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment.status).toBe('under_maintenance');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/maintenance`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(inMaintenance);
    });
  });

  // ── listAttachments ────────────────────────────────────────────────────────

  describe('listAttachments', () => {
    it('should send GET request and return attachments collection', () => {
      service.listAttachments(orgId, equipmentId).subscribe((response) => {
        expect(response.member).toEqual([mockAttachment]);
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/attachments`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockAttachment]));
    });
  });

  // ── addAttachment ──────────────────────────────────────────────────────────

  describe('addAttachment', () => {
    const input: AddAttachmentInput = {
      content: 'base64EncodedContent==',
      mimeType: 'application/pdf',
      fileName: 'datasheet.pdf',
      label: 'Technical Datasheet',
    };

    it('should send POST request and return created attachment', () => {
      service.addAttachment(orgId, equipmentId, input).subscribe((attachment) => {
        expect(attachment.fileName).toBe('datasheet.pdf');
        expect(attachment.label).toBe('Technical Datasheet');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/attachments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockAttachment);
    });
  });

  // ── deleteAttachment ───────────────────────────────────────────────────────

  describe('deleteAttachment', () => {
    it('should send DELETE request to remove attachment', () => {
      service.deleteAttachment(orgId, equipmentId, 'attach-uuid-1').subscribe((result) => {
        expect(result).toBeUndefined();
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/attachments/attach-uuid-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });

    it('should handle not found error', () => {
      service.deleteAttachment(orgId, equipmentId, 'nonexistent').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/attachments/nonexistent`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── addTag ─────────────────────────────────────────────────────────────────

  describe('addTag', () => {
    const input: AddTagInput = { name: 'critical' };

    it('should send POST request and return created tag', () => {
      service.addTag(orgId, equipmentId, input).subscribe((tag) => {
        expect(tag.name).toBe('critical');
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/tags`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockTag);
    });
  });

  // ── removeTag ──────────────────────────────────────────────────────────────

  describe('removeTag', () => {
    it('should send DELETE request to remove tag', () => {
      service.removeTag(orgId, equipmentId, 'tag-uuid-1').subscribe((result) => {
        expect(result).toBeUndefined();
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/tags/tag-uuid-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });
  });
});
