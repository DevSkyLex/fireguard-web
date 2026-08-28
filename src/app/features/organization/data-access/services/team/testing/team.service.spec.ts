import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  TeamOutput,
  TeamMemberOutput,
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
} from '@features/organization/models';
import { TeamService } from '../team.service';

describe('TeamService', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-1';
  const teamsUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/teams`;

  const team = {
    '@id': '/api/organizations/org-1/teams/team-1',
    '@type': 'Team',
    id: 'team-1',
    organizationId: 'org-1',
    name: 'Fire safety squad',
    description: '',
    memberCount: 3,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  } as TeamOutput;

  const teamMember: TeamMemberOutput = {
    '@id': '/api/organizations/org-1/teams/team-1/members/member-1',
    '@type': 'TeamMember',
    memberId: 'member-1',
    role: 'lead',
    addedAt: '2026-07-02T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TeamService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── list ───────────────────────────────────────────────────────────────────

  it('lists the teams of an organization', () => {
    let result: TeamOutput[] = [];

    service.list(orgId).subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(teamsUrl);
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': teamsUrl,
      '@type': 'Collection',
      totalItems: 1,
      member: [team],
    });

    expect(result).toEqual([team]);
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return the team', () => {
      service.get(orgId, 'team-1').subscribe((result) => {
        expect(result.id).toBe('team-1');
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(team);
    });

    it('should handle not found', () => {
      service.get(orgId, 'team-9').subscribe({
        error: (error: ApiError) => expect(error.status).toBe(404),
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-9`);
      req.flush({ status: 404, title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const input: CreateTeamInput = { name: 'Rescue crew', description: null };

    it('should send POST request and return the created team', () => {
      const created: TeamOutput = { ...team, name: 'Rescue crew' };

      service.create(orgId, input).subscribe((result) => {
        expect(result.name).toBe('Rescue crew');
      });

      const req = httpMock.expectOne(teamsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(created);
    });

    it('should surface a duplicate-name conflict', () => {
      service.create(orgId, input).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(409),
      });

      const req = httpMock.expectOne(teamsUrl);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const input: UpdateTeamInput = { name: 'Renamed squad' };

    it('should send PATCH request and return the updated team', () => {
      const updated: TeamOutput = { ...team, name: 'Renamed squad' };

      service.update(orgId, 'team-1', input).subscribe((result) => {
        expect(result.name).toBe('Renamed squad');
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      req.flush(updated);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should send DELETE request for the team', () => {
      service.remove(orgId, 'team-1').subscribe();

      const req = httpMock.expectOne(`${teamsUrl}/team-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });
  });

  // ── listMembers ────────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('should send GET request and return the members collection', () => {
      let result: TeamMemberOutput[] = [];

      service.listMembers(orgId, 'team-1').subscribe((collection) => {
        result = [...collection.member];
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-1/members`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({
        '@id': `${teamsUrl}/team-1/members`,
        '@type': 'Collection',
        totalItems: 1,
        member: [teamMember],
      });

      expect(result).toEqual([teamMember]);
    });
  });

  // ── addMember ──────────────────────────────────────────────────────────────

  describe('addMember', () => {
    const input: AddTeamMemberInput = { memberId: 'member-1', role: 'lead' };

    it('should send POST request and return the created membership', () => {
      service.addMember(orgId, 'team-1', input).subscribe((result) => {
        expect(result.memberId).toBe('member-1');
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-1/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(teamMember);
    });

    it('should surface a bad-request for an inactive or duplicate member', () => {
      service.addMember(orgId, 'team-1', input).subscribe({
        error: (error: ApiError) => expect(error.status).toBe(400),
      });

      const req = httpMock.expectOne(`${teamsUrl}/team-1/members`);
      req.flush({ status: 400, title: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  // ── removeMember ───────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('should send DELETE request for the team membership', () => {
      service.removeMember(orgId, 'team-1', 'member-1').subscribe();

      const req = httpMock.expectOne(`${teamsUrl}/team-1/members/member-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
    });
  });
});
