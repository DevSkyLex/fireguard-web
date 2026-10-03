import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { FacilityAttachmentService } from '../facility-attachment.service';

describe('FacilityAttachmentService', () => {
  let service: FacilityAttachmentService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const facilityId = 'facility-uuid-1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FacilityAttachmentService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(FacilityAttachmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const mockAttachment: FacilityAttachmentOutput = {
    '@id': '/api/facility-attachments/attachment-1',
    '@type': 'FacilityAttachment',
    id: 'attachment-1',
    facilityId,
    fileName: 'ground-floor.png',
    mimeType: 'image/png',
    size: 2048,
    kind: 'floor_plan',
    isPrimaryPlan: false,
    imageWidth: 1200,
    imageHeight: 800,
    revision: 1,
    uploadedAt: '2026-08-01T00:00:00+00:00',
  };

  describe('list', () => {
    it('lists a facility attachments without a kind filter', () => {
      service
        .list(facilityId)
        .subscribe((result) => expect(result.member).toEqual([mockAttachment]));

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facilities/${facilityId}/attachments`,
      );
      expect(request.request.method).toBe('GET');
      request.flush({
        '@id': `/api/facilities/${facilityId}/attachments`,
        '@type': 'Collection',
        member: [mockAttachment],
        totalItems: 1,
      });
    });

    it('forwards the kind filter as a query param', () => {
      service.list(facilityId, 'floor_plan').subscribe();

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facilities/${facilityId}/attachments?kind=floor_plan`,
      );
      expect(request.request.method).toBe('GET');
      request.flush({
        '@id': `/api/facilities/${facilityId}/attachments`,
        '@type': 'Collection',
        member: [],
        totalItems: 0,
      });
    });
  });

  describe('upload', () => {
    it('sends a multipart request carrying the kind field', () => {
      const file = new Blob(['plan'], { type: 'image/png' });

      service
        .upload(facilityId, file, 'ground-floor.png', 'floor_plan')
        .subscribe((result) => expect(result).toEqual(mockAttachment));

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facilities/${facilityId}/attachments`,
      );
      expect(request.request.method).toBe('POST');
      const body = request.request.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect(body.get('kind')).toBe('floor_plan');
      expect((body.get('file') as File).name).toBe('ground-floor.png');
      request.flush(mockAttachment);
    });

    it('omits the kind field for a plain document', () => {
      const file = new Blob(['doc'], { type: 'application/pdf' });

      service.upload(facilityId, file, 'manual.pdf').subscribe();

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facilities/${facilityId}/attachments`,
      );
      const body = request.request.body as FormData;
      expect(body.get('kind')).toBeNull();
      request.flush({ ...mockAttachment, kind: 'document', fileName: 'manual.pdf' });
    });
  });

  describe('setPrimary', () => {
    it('posts to the primary action with no body', () => {
      service
        .setPrimary(mockAttachment.id)
        .subscribe((result) => expect(result.isPrimaryPlan).toBe(true));

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facility-attachments/${mockAttachment.id}/primary`,
      );
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush({ ...mockAttachment, isPrimaryPlan: true });
    });
  });

  describe('remove', () => {
    it('sends the revision as an If-Match precondition', () => {
      service.remove(mockAttachment.id, 3).subscribe();

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facility-attachments/${mockAttachment.id}`,
      );
      expect(request.request.method).toBe('DELETE');
      expect(request.request.headers.get('If-Match')).toBe('"revision-3"');
      request.flush(null);
    });
  });

  describe('download', () => {
    it('reads the attachment bytes as a blob', () => {
      const bytes = new Blob(['plan-bytes'], { type: 'image/png' });

      service.download(mockAttachment.id).subscribe((result) => expect(result).toEqual(bytes));

      const request = httpMock.expectOne(
        `${mockEnv.apiUrl}/api/facility-attachments/${mockAttachment.id}/download`,
      );
      expect(request.request.method).toBe('GET');
      request.flush(bytes);
    });
  });
  it('calibrates an immutable plan with its revision and supports clearing', () => {
    const calibration = {
      widthMeters: 40,
      rotationDegrees: 90,
      offsetXMeters: -5,
      offsetZMeters: 2,
    };
    service.setCalibration('attachment-1', calibration, 7).subscribe();
    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/facility-attachments/attachment-1/calibration`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"revision-7"');
    expect(request.request.body).toEqual({ calibration });
    request.flush({ ...mockAttachment, calibration, revision: 8 });
    service.setCalibration('attachment-1', null, 8).subscribe();
    const clear = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/facility-attachments/attachment-1/calibration`,
    );
    expect(clear.request.body).toEqual({ calibration: null });
    clear.flush({ ...mockAttachment, calibration: null, revision: 9 });
  });
});
