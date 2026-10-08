import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { maintenanceExportFixture } from '@features/organization/features/maintenance-exports/models/export/testing/maintenance-export.fixture';
import { MaintenanceExportService } from '../maintenance-export.service';

describe('MaintenanceExportService contract', () => {
  let api: MaintenanceExportService, http: HttpTestingController;
  const base = 'https://api.test/api/organizations/org';
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MaintenanceExportService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    api = TestBed.inject(MaintenanceExportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('retains a bounded dossier selection and exact operation identity', () => {
    const input = {
      clientOperationId: 'stable',
      interventionIds: ['dossier-1'],
      system: 'ERP',
      includeInternalCosts: false,
    };
    api.create('org', input).subscribe();
    const request = http.expectOne(base + '/maintenance-exports');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush(maintenanceExportFixture());
  });
  it.each(['adjust', 'confirm'] as const)('uses the displayed quoted revision for %s', (kind) => {
    if (kind === 'adjust')
      api
        .adjust(
          'org',
          'export-1',
          { clientOperationId: 'stable-adjust', reason: 'Validated correction' },
          4,
        )
        .subscribe();
    else
      api
        .confirm(
          'org',
          'export-1',
          { clientOperationId: 'stable-confirm', externalImportReference: 'IMPORT-25' },
          4,
        )
        .subscribe();
    const request = http.expectOne(
      base + '/maintenance-exports/export-1/' + (kind === 'adjust' ? 'adjustments' : 'confirm'),
    );
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    expect(request.request.method).toBe('POST');
    request.flush(maintenanceExportFixture());
  });
  it('downloads retained CSV bytes without rebuilding rows or JSON conversion', () => {
    let downloaded: Blob | undefined;
    const bytes = new Blob(['id;amount\r\noriginal;0.000001\r\n'], { type: 'text/csv' });
    api.download('org', 'export-1', 'csv').subscribe((blob) => {
      downloaded = blob;
    });
    const request = http.expectOne(base + '/maintenance-exports/export-1/files/csv');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.withCredentials).toBe(true);
    request.flush(bytes);
    expect(downloaded).toBe(bytes);
  });
  it('queries the exact mapping tuple and writes optimistic revision zero only for a reviewed absence', () => {
    api
      .listReferences('org', {
        page: 1,
        itemsPerPage: 30,
        params: { resourceType: 'equipment', resourceId: 'equipment-1', system: 'ERP' },
      })
      .subscribe();
    const read = http.expectOne(
      (request) => request.url === base + '/maintenance-export-references',
    );
    expect(read.request.params.get('resourceId')).toBe('equipment-1');
    expect(read.request.params.get('system')).toBe('ERP');
    read.flush({ member: [], totalItems: 0 });
    const input = { clientOperationId: 'stable-map', system: 'ERP', reference: 'ERP-E-1' };
    api.writeReference('org', 'equipment', 'equipment-1', input, 0).subscribe();
    const write = http.expectOne(base + '/maintenance-export-references/equipment/equipment-1');
    expect(write.request.headers.get('If-Match')).toBe('"revision-0"');
    expect(write.request.body).toEqual(input);
    write.flush({ id: 'map', ...input, revision: 1 });
  });
  it('sends published selection search and page to the server', () => {
    api.listSources('org', { page: 3, itemsPerPage: 30, search: 'Park control' }).subscribe();
    const request = http.expectOne((item) => item.url === base + '/maintenance-export-sources');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('itemsPerPage')).toBe('30');
    expect(request.request.params.get('search')).toBe('Park control');
    request.flush({ member: [], totalItems: 0 });
  });
});
