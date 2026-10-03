import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  FacilityModelInput,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';
import { FacilityModelService } from '../facility-model.service';

describe('FacilityModelService', () => {
  let service: FacilityModelService;
  let httpMock: HttpTestingController;
  const base = 'https://api.test';
  const settings: FacilityModelInput = {
    transform: { scale: 2, rotationDegrees: 90, translation: { x: 3, y: -2, z: 4 } },
    bindings: [{ nodeIndex: 1, facilityId: 'room-1' }],
  };
  const model: FacilityModelOutput = {
    '@id': '/api/facility-models/model-1',
    '@type': 'FacilityModel',
    id: 'model-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    fileName: 'building.glb',
    mimeType: 'model/gltf-binary',
    fileSize: 80,
    nodeCount: 2,
    nodes: [
      { index: 0, name: 'Room' },
      { index: 1, name: 'Room' },
    ],
    revision: 4,
    active: false,
    ...settings,
    bindings: settings.bindings ?? [],
    bindingIssues: [],
    downloadUrl: '/api/facility-models/model-1/download',
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FacilityModelService,
        { provide: ENV_CONFIG, useValue: { apiUrl: base } },
      ],
    });
    service = TestBed.inject(FacilityModelService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => httpMock.verify());

  it('reads the organization and building-scoped collection', () => {
    service
      .list('org-1', 'building-1')
      .subscribe((result) => expect(result.member).toEqual([model]));
    const request = httpMock.expectOne(
      `${base}/api/organizations/org-1/facilities/building-1/models`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ member: [model], totalItems: 1 });
  });

  it('uploads one immutable GLB file as multipart without a JSON content type', () => {
    service
      .upload('org-1', 'building-1', new Blob(['glb']), 'building.glb')
      .subscribe((result) => expect(result.id).toBe('model-1'));
    const request = httpMock.expectOne(
      `${base}/api/organizations/org-1/facilities/building-1/models`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    const body = request.request.body as FormData;
    expect(body.get('file')).toBeInstanceOf(Blob);
    expect((body.get('file') as File).name).toBe('building.glb');
    request.flush(model);
  });

  it('reads the canonical model revision and source indices', () => {
    service.get('model-1').subscribe((result) => expect(result.nodes).toEqual(model.nodes));
    const request = httpMock.expectOne(`${base}/api/facility-models/model-1`);
    expect(request.request.method).toBe('GET');
    request.flush(model);
  });

  it('sends complete settings with the revision and merge-patch content type', () => {
    service.update('model-1', settings, 4).subscribe();
    const request = httpMock.expectOne(`${base}/api/facility-models/model-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual(settings);
    request.flush({ ...model, revision: 5 });
  });

  it('protects activation and deletion with independent revision preconditions', () => {
    service.activate('model-1', 4).subscribe();
    const activate = httpMock.expectOne(`${base}/api/facility-models/model-1/activate`);
    expect(activate.request.method).toBe('POST');
    expect(activate.request.body).toBeNull();
    expect(activate.request.headers.get('If-Match')).toBe('"revision-4"');
    activate.flush({ ...model, active: true, revision: 5 });
    service.remove('model-1', 5).subscribe();
    const remove = httpMock.expectOne(`${base}/api/facility-models/model-1`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('If-Match')).toBe('"revision-5"');
    remove.flush(null);
  });

  it('downloads model bytes through authenticated HTTP', () => {
    const blob = new Blob(['glb'], { type: 'model/gltf-binary' });
    service.download('model-1').subscribe((result) => expect(result).toBe(blob));
    const request = httpMock.expectOne(`${base}/api/facility-models/model-1/download`);
    expect(request.request.responseType).toBe('blob');
    expect(request.request.withCredentials).toBe(true);
    request.flush(blob);
  });

  it('propagates a stale-revision refusal with its original status and detail', () => {
    const error = {
      '@type': 'Error',
      '@id': '',
      type: 'about:blank',
      title: 'Conflict',
      status: 412,
      detail: 'The model changed.',
    };
    service
      .update('model-1', settings, 4)
      .subscribe({ error: (failure: unknown) => expect(failure).toEqual(error) });
    httpMock
      .expectOne(`${base}/api/facility-models/model-1`)
      .flush(error, { status: 412, statusText: 'Precondition Failed' });
  });
});
