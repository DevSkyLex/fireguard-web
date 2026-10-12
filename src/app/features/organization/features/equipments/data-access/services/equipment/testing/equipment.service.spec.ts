import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { retry, type Observable } from 'rxjs';
import type { ApiRequestOptions } from '@core/api';

import type { HydraCollection, HydraItem, ApiError } from '@core/api/models';
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
  EquipmentKpiOutput,
  EquipmentFacilitySummaryOutput,
} from '@features/organization/features/equipments/models';
import { EquipmentService } from '../equipment.service';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const equipmentId = 'equipment-uuid-1';
  const facilityId = 'facility-uuid-1';
  const equipmentBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/equipment`;
  const facilityEquipmentBaseUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/facilities/${facilityId}/equipment`;

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

  it.each(['replace', 'setPlanPosition'] as const)(
    '%s retains one key across retry and cold subscriptions and accepts a caller key with ETag',
    (action) => {
      const invoke = (options?: ApiRequestOptions): Observable<unknown> =>
        action === 'replace'
          ? service.replace(
              orgId,
              equipmentId,
              {
                clientOperationId: 'd2389ec7-894c-4aab-89d3-e5b3f427b1ff',
                successorEquipmentId: 'successor',
              },
              options,
            )
          : service.setPlanPosition(
              orgId,
              equipmentId,
              { attachmentId: 'plan', x: 0.4, y: 0.6 },
              options,
            );
      const url = `${equipmentBaseUrl}/${equipmentId}/${action === 'replace' ? 'replace' : 'plan-position'}`;
      const request$ = invoke();
      request$.pipe(retry(1)).subscribe();
      const lost = httpMock.expectOne(url);
      const key = lost.request.headers.get('Idempotency-Key');
      expect(key).toMatch(/^[0-9a-f-]{36}$/i);
      lost.flush({}, { status: 503, statusText: 'Response unavailable' });
      const retried = httpMock.expectOne(url);
      expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
      retried.flush(null);
      request$.subscribe();
      const resubscribed = httpMock.expectOne(url);
      expect(resubscribed.request.headers.get('Idempotency-Key')).toBe(key);
      resubscribed.flush(null);
      invoke().subscribe();
      const newIntent = httpMock.expectOne(url);
      expect(newIntent.request.headers.get('Idempotency-Key')).not.toBe(key);
      newIntent.flush(null);
      const options = {
        idempotencyKey: 'c3c1e943-227b-4f31-98c7-90e988359b68',
        headers: { 'If-Match': '"revision-3"' },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        invoke(options).subscribe();
        const manual = httpMock.expectOne(url);
        expect(manual.request.headers.get('Idempotency-Key')).toBe(options.idempotencyKey);
        expect(manual.request.headers.get('If-Match')).toBe('"revision-3"');
        manual.flush(null);
      }
    },
  );

  it('posts one stable atomic replacement command without creating a separate equipment first', () => {
    const input = {
      clientOperationId: '94ed10c6-55de-4853-8027-d2d6f5da6cbb',
      successor: { type: 'fire_extinguisher', name: 'Emergency entrance', assetCode: 'EXT-3' },
    };
    const next = vi.fn();
    service.replace(orgId, equipmentId, input).subscribe(next);
    const request = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/replace`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    expect(request.request.withCredentials).toBe(true);
    const receipt = {
      clientOperationId: input.clientOperationId,
      predecessorEquipmentId: equipmentId,
      successorEquipmentId: 'next-equipment',
      replayed: false,
    };
    request.flush(receipt);
    expect(next).toHaveBeenCalledWith(receipt);
    httpMock.expectNone(
      (candidate) => candidate.url === equipmentBaseUrl && candidate.method === 'POST',
    );
  });

  it('reads exact inspection evidence from the authorized equipment summary', () => {
    const next = vi.fn();
    service.inspectionSummary(orgId, equipmentId).subscribe(next);
    const request = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/inspection-summary`);
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': request.request.url,
      '@type': 'EquipmentInspectionSummary',
      equipmentId,
      openAnomalies: 2,
      bySeverity: { low: 0, medium: 1, high: 1, critical: 0 },
    });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ equipmentId, openAnomalies: 2 }));
  });

  it('rejects an empty explicit label selection without issuing an inventory request', () => {
    const failed = vi.fn();
    service.exportLabels(orgId, { ids: [] }).subscribe({ error: failed });
    expect(failed).toHaveBeenCalledOnce();
    httpMock.expectNone((request) => request.url.includes('labels'));
  });

  const mockEquipment: EquipmentOutput = {
    '@id': `/api/organizations/${orgId}/equipment/${equipmentId}`,
    '@type': 'Equipment',
    id: equipmentId,
    organizationId: orgId,
    facilityId: null,
    facilityName: null,
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
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
  };

  const mockAttachment: EquipmentAttachmentOutput = {
    '@id': `/api/organizations/${orgId}/equipment/${equipmentId}/attachments/attach-uuid-1`,
    '@type': 'EquipmentAttachment',
    id: 'attach-uuid-1',
    revision: 1,
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

  describe('summaryByFacility', () => {
    for (const includeDescendants of [true, false]) {
      it(`requests exact ${includeDescendants ? 'subtree' : 'direct'} totals`, () => {
        const summary: EquipmentFacilitySummaryOutput = {
          '@id': `${facilityEquipmentBaseUrl}-summary`,
          '@type': 'FacilityEquipmentSummary',
          scope: includeDescendants ? 'subtree' : 'direct',
          totalItems: 251,
          byStatus: { operational: 220, in_stock: 1, under_maintenance: 20, decommissioned: 10 },
          needingAttentionCount: 30,
        };
        service
          .summaryByFacility(orgId, facilityId, includeDescendants)
          .subscribe((value) => expect(value).toEqual(summary));
        const request = httpMock.expectOne(
          (req) => req.url === `${facilityEquipmentBaseUrl}-summary`,
        );
        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('includeDescendants')).toBe(String(includeDescendants));
        request.flush(summary);
      });
    }
  });

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

    it('should route to facility endpoint when facilityId filter is provided', () => {
      service.list(orgId, { page: 2, itemsPerPage: 25, params: { facilityId } }).subscribe();

      const req = httpMock.expectOne((r) => r.url === facilityEquipmentBaseUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('itemsPerPage')).toBe('25');
      expect(req.request.params.get('facilityId')).toBeNull();
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

  // ── kpis ───────────────────────────────────────────────────────────────────

  describe('kpis', () => {
    it('should send GET request and return the KPI snapshot', () => {
      const mockKpis: EquipmentKpiOutput = {
        '@id': `/api/organizations/${orgId}/equipment/kpis`,
        '@type': 'EquipmentKpi',
        totalAssets: 40,
        compliant: 30,
        dueSoon: 5,
        openNonConformities: 2,
      };

      service.kpis(orgId).subscribe((kpis) => {
        expect(kpis).toEqual(mockKpis);
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/kpis`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockKpis);
    });

    it('should propagate a fetch failure untouched', () => {
      service.kpis(orgId).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(403),
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/kpis`);
      req.flush({ status: 403, title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
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

  // ── setPlanPosition ────────────────────────────────────────────────────────

  describe('setPlanPosition', () => {
    it('should send PUT request with the position body', () => {
      service
        .setPlanPosition(orgId, equipmentId, { attachmentId: 'plan-1', x: 0.4, y: 0.6 })
        .subscribe();

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/plan-position`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual({ attachmentId: 'plan-1', x: 0.4, y: 0.6 });
      req.flush(null);
    });

    it('should send null fields to clear the position', () => {
      service
        .setPlanPosition(orgId, equipmentId, { attachmentId: null, x: null, y: null })
        .subscribe();

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/plan-position`);
      expect(req.request.body).toEqual({ attachmentId: null, x: null, y: null });
      req.flush(null);
    });

    it('should propagate a conflict error', () => {
      service
        .setPlanPosition(orgId, equipmentId, { attachmentId: 'plan-1', x: 0.1, y: 0.1 })
        .subscribe({
          error: (error: ApiError) => expect(error.status).toBe(409),
        });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/${equipmentId}/plan-position`);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
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
        status: 'operational',
        commissionedAt: '2026-03-01T00:00:00+00:00',
      };

      service.commission(orgId, equipmentId).subscribe((equipment) => {
        expect(equipment.status).toBe('operational');
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

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should resolve the canonical revision then send a DELETE with If-Match', () => {
      service.remove(equipmentId).subscribe();

      const canonicalUrl = `${mockEnv.apiUrl}/api/equipment/${equipmentId}`;
      const canonicalReq = httpMock.expectOne(canonicalUrl);
      expect(canonicalReq.request.method).toBe('GET');
      canonicalReq.flush({ ...mockEquipment, revision: 2 });

      const deleteReq = httpMock.expectOne(canonicalUrl);
      expect(deleteReq.request.method).toBe('DELETE');
      expect(deleteReq.request.headers.get('If-Match')).toBe('"revision-2"');
      deleteReq.flush(null, { status: 204, statusText: 'No Content' });
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

      const req = httpMock.expectOne(
        `${equipmentBaseUrl}/${equipmentId}/attachments/attach-uuid-1`,
      );
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

  describe('downloadAttachment', () => {
    it('should send a GET request for the blob content', () => {
      const blob = new Blob(['content'], { type: 'application/pdf' });

      service.downloadAttachment(orgId, equipmentId, 'attach-uuid-1').subscribe((result) => {
        expect(result).toBeInstanceOf(Blob);
      });

      const req = httpMock.expectOne(
        `${equipmentBaseUrl}/${equipmentId}/attachments/attach-uuid-1/download`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.withCredentials).toBe(true);
      req.flush(blob);
    });
  });

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

  describe('exportCsv', () => {
    it('reads the CSV export as a blob from the organization equipment export route', () => {
      const content = new Blob(['csv-bytes'], { type: 'text/csv' });
      let result: Blob | undefined;

      service.exportCsv(orgId).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/export`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.withCredentials).toBe(true);
      req.flush(content);

      expect(result).toEqual(content);
    });
  });

  describe('exportLabels', () => {
    it('reads the whole-inventory label sheet PDF as a blob with no params', () => {
      const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
      let result: Blob | undefined;

      service.exportLabels(orgId).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/labels`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.withCredentials).toBe(true);
      req.flush(content);

      expect(result).toEqual(content);
    });

    it('sends an explicit selection as repeated ids[] params', () => {
      service.exportLabels(orgId, { ids: ['eq-1', 'eq-2'] }).subscribe();

      const req = httpMock.expectOne(
        (candidate) =>
          candidate.url === `${equipmentBaseUrl}/labels` &&
          candidate.params.getAll('ids[]')?.join(',') === 'eq-1,eq-2',
      );
      expect(req.request.params.has('facilityId')).toBe(false);
      req.flush(new Blob());
    });

    it('sends a facility subtree selection as facilityId', () => {
      service.exportLabels(orgId, { facilityId: 'facility-1' }).subscribe();

      const req = httpMock.expectOne(
        (candidate) =>
          candidate.url === `${equipmentBaseUrl}/labels` &&
          candidate.params.get('facilityId') === 'facility-1',
      );
      expect(req.request.params.has('ids[]')).toBe(false);
      req.flush(new Blob());
    });

    it('propagates the 422 over-500-labels refusal untouched', () => {
      let status: number | undefined;

      service.exportLabels(orgId).subscribe({
        error: (error: { status: number }) => {
          status = error.status;
        },
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/labels`);
      req.flush(new Blob(), { status: 422, statusText: 'Unprocessable Entity' });

      expect(status).toBe(422);
    });
  });

  describe('exportReport', () => {
    it('reads the equipment sheet PDF as a blob from the equipment report route', () => {
      const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
      let result: Blob | undefined;

      service.exportReport(orgId, 'equipment-1').subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/equipment-1/report`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      expect(req.request.withCredentials).toBe(true);
      req.flush(content);

      expect(result).toEqual(content);
    });

    it('propagates a 403 error untouched for the page to resolve its RFC 7807 detail', () => {
      let caught: unknown;

      service.exportReport(orgId, 'equipment-1').subscribe({ error: (error) => (caught = error) });

      const req = httpMock.expectOne(`${equipmentBaseUrl}/equipment-1/report`);
      req.flush(new Blob(['{}'], { type: 'application/json' }), {
        status: 403,
        statusText: 'Forbidden',
      });

      expect(caught).toBeInstanceOf(HttpErrorResponse);
      expect((caught as HttpErrorResponse).status).toBe(403);
    });
  });
  const effectfulExports = [
    {
      name: 'inventory CSV',
      url: `${equipmentBaseUrl}/export`,
      invoke: (requestOptions?: ApiRequestOptions) => service.exportCsv(orgId, requestOptions),
    },
    {
      name: 'QR labels PDF',
      url: `${equipmentBaseUrl}/labels`,
      invoke: (requestOptions?: ApiRequestOptions) =>
        service.exportLabels(orgId, { ids: ['eq-1', 'eq-2'] }, requestOptions),
    },
    {
      name: 'equipment report PDF',
      url: `${equipmentBaseUrl}/${equipmentId}/report`,
      invoke: (requestOptions?: ApiRequestOptions) =>
        service.exportReport(orgId, equipmentId, requestOptions),
    },
  ];

  it.each(effectfulExports)(
    'retains one binary GET identity across retries and resubscriptions for $name',
    ({ url, invoke }) => {
      const intent = invoke();
      const received = vi.fn();
      const content = new Blob(['export-bytes'], { type: 'application/octet-stream' });
      httpMock.expectNone(url);
      intent.pipe(retry(1)).subscribe(received);

      const initial = httpMock.expectOne((request) => request.url === url);
      const key = initial.request.headers.get('Idempotency-Key');
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(initial.request.method).toBe('GET');
      expect(initial.request.responseType).toBe('blob');
      expect(initial.request.body).toBeNull();
      expect(initial.request.withCredentials).toBe(true);
      expect(initial.request.params.has('idempotencyKey')).toBe(false);
      const query = initial.request.params.toString();
      initial.error(new ProgressEvent('error'));

      const retried = httpMock.expectOne((request) => request.url === url);
      expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
      expect(retried.request.params.toString()).toBe(query);
      retried.flush(content);
      expect(received).toHaveBeenLastCalledWith(content);

      intent.subscribe(received);
      const resubscribed = httpMock.expectOne((request) => request.url === url);
      expect(resubscribed.request.headers.get('Idempotency-Key')).toBe(key);
      resubscribed.flush(content);

      invoke().subscribe(received);
      const nextIntent = httpMock.expectOne((request) => request.url === url);
      expect(nextIntent.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/i);
      expect(nextIntent.request.headers.get('Idempotency-Key')).not.toBe(key);
      nextIntent.flush(content);
      expect(received).toHaveBeenCalledTimes(3);
    },
  );

  it.each(effectfulExports)(
    'forwards an explicit identity for manual binary GET retries of $name',
    ({ url, invoke }) => {
      const requestOptions: ApiRequestOptions = {
        idempotencyKey: '24316949-d384-4fa7-9f67-6b3af1c4bbce',
        headers: { 'X-Export-Trace': 'transport-check' },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        invoke(requestOptions).subscribe();
        const request = httpMock.expectOne((candidate) => candidate.url === url);
        expect(request.request.headers.get('Idempotency-Key')).toBe(requestOptions.idempotencyKey);
        expect(request.request.headers.get('X-Export-Trace')).toBe('transport-check');
        expect(request.request.params.has('idempotencyKey')).toBe(false);
        expect(request.request.params.has('headers')).toBe(false);
        request.flush(new Blob());
      }
    },
  );

  it('allocates independent export identities in separate server request injectors without TransferState', () => {
    const keys: (string | null)[] = [];
    for (let requestIndex = 0; requestIndex < 2; requestIndex++) {
      httpMock.verify();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          EquipmentService,
          { provide: ENV_CONFIG, useValue: mockEnv },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      service = TestBed.inject(EquipmentService);
      httpMock = TestBed.inject(HttpTestingController);
      service.exportCsv(orgId).subscribe();
      const request = httpMock.expectOne(`${equipmentBaseUrl}/export`);
      keys.push(request.request.headers.get('Idempotency-Key'));
      expect(keys[requestIndex]).toMatch(/^[0-9a-f-]{36}$/i);
      request.flush(new Blob());
      expect(TestBed.inject(TransferState).toJson()).toBe('{}');
    }
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('keeps immutable attachment bytes as an ordinary read', () => {
    service.downloadAttachment(orgId, equipmentId, 'attachment-1').subscribe();
    const request = httpMock.expectOne(
      `${equipmentBaseUrl}/${equipmentId}/attachments/attachment-1/download`,
    );
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob());
  });
});
