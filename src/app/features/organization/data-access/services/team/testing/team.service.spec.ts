import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { TeamOutput } from '@features/organization/models';
import { TeamService } from '../team.service';

describe('TeamService', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

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

  it('lists the teams of an organization', () => {
    let result: TeamOutput[] = [];

    service.list('org-1').subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/organizations/org-1/teams`);
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/organizations/org-1/teams',
      '@type': 'Collection',
      totalItems: 1,
      member: [team],
    });

    expect(result).toEqual([team]);
  });
});
