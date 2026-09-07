import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { OrganizationAccessService } from '../organization-access.service';

describe('OrganizationAccessService', () => {
  let service: OrganizationAccessService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationAccessService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(OrganizationAccessService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('discovers only for the authenticated account without a supplied domain', () => {
    service.options().subscribe();
    const req = http.expectOne('https://api.test/api/organizations/join-options');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ emailProofRequired: true, invitations: [], organizations: [], requests: [] });
  });
  it('accepts by invitation identifier without exposing its token', () => {
    service.acceptInvitation('invitation-id').subscribe();
    const req = http.expectOne(
      'https://api.test/api/organizations/invitations/invitation-id/accept',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ organizationId: 'organization' });
  });
  it('sends the selected approval roles within the scoped organization', () => {
    service.approve('organization', 'request', ['member']).subscribe();
    const req = http.expectOne(
      'https://api.test/api/organizations/organization/join-requests/request/approve',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ roleIds: ['member'] });
    req.flush({});
  });
  it('loads requests and permitted roles in one authorized response', () => {
    const result = vi.fn();
    service.requests('organization').subscribe(result);
    const req = http.expectOne(
      (r) => r.url === 'https://api.test/api/organizations/organization/join-requests',
    );
    const response = {
      member: [],
      totalItems: 0,
      assignableRoles: [{ id: 'member', label: 'Member' }],
    };
    req.flush(response);
    expect(result).toHaveBeenCalledWith(response);
  });
  it('preserves stable problem codes for localized user feedback', () => {
    const failed = vi.fn();
    service.join('organization').subscribe({ error: failed });
    http
      .expectOne('https://api.test/api/organizations/organization/join')
      .flush(
        { status: 409, code: 'organization_join_role_ineligible', detail: 'Localized failure' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'organization_join_role_ineligible', status: 409 }),
    );
  });
});
