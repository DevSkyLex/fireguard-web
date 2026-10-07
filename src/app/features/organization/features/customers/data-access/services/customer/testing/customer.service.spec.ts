import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { CustomerOutput } from '@features/organization/features/customers/models';
import { CustomerService } from '../customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let http: HttpTestingController;
  const url = 'https://api.test/api/organizations/org/customers';
  const customer: CustomerOutput = {
    '@id': url + '/customer',
    '@type': 'Customer',
    id: 'customer',
    organizationId: 'org',
    name: 'North Hospital',
    contacts: [],
    revision: 3,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CustomerService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(CustomerService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('searches and paginates the authorized active directory', () => {
    service
      .list('org', { page: 2, itemsPerPage: 20, search: 'hospital', params: { archived: false } })
      .subscribe();
    const request = http.expectOne((candidate) => candidate.url === url);
    expect(request.request.params.get('search')).toBe('hospital');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('archived')).toBe('false');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ member: [], totalItems: 0 });
  });
  it('creates contacts without confusing customer identities with offline client ids', () => {
    const input = {
      name: 'Hospital',
      contacts: [
        { name: 'Safety manager', role: 'Safety', phone: null, email: 'safety@example.test' },
      ],
    };
    service.create('org', input).subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    expect(request.request.body.clientId).toBeUndefined();
    request.flush(customer);
  });
  it('sends explicit clears and the quoted revision on update', () => {
    service.update('org', customer, { name: 'Hospital', email: null, contacts: [] }).subscribe();
    const request = http.expectOne(url + '/customer');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-3"');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body.email).toBeNull();
    request.flush(customer);
  });
  it('archives and restores with revision checks and propagates stale conflicts', () => {
    let failure: unknown;
    service.archive('org', customer).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    const archive = http.expectOne(url + '/customer/archive');
    expect(archive.request.headers.get('If-Match')).toBe('"revision-3"');
    archive.flush(
      { title: 'Revision conflict', detail: 'Reload before retrying.' },
      { status: 412, statusText: 'Precondition Failed' },
    );
    expect(failure).toMatchObject({ status: 412, detail: 'Reload before retrying.' });
    service.restore('org', customer).subscribe();
    const restore = http.expectOne(url + '/customer/restore');
    expect(restore.request.method).toBe('POST');
    expect(restore.request.headers.get('If-Match')).toBe('"revision-3"');
    restore.flush(customer);
  });
});
