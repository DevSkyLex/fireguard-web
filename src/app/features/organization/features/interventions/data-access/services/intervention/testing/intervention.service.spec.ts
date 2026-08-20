import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  InterventionActivityOutput,
  InterventionOutput,
  InterventionStatisticsOutput,
  InterventionWorkItemOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import { InterventionService } from '../intervention.service';

describe('InterventionService', () => {
  let service: InterventionService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        InterventionService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(InterventionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads an asynchronous publication by its canonical resource URL', () => {
    const publication = {
      '@id': '/api/publications/publication-1',
      '@type': 'Publication',
      id: 'publication-1',
      status: 'processing',
    } as PublicationOutput;

    service
      .getPublication(publication.id)
      .subscribe((result) => expect(result).toEqual(publication));

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/publications/${publication.id}`);
    expect(request.request.method).toBe('GET');
    request.flush(publication);
  });

  it('reads the whole-organization statistics scoped by the organization IRI', () => {
    const statistics = {
      '@id': '/api/interventions/statistics',
      '@type': 'InterventionStatistics',
      id: 'statistics',
      total: 12,
    } as unknown as InterventionStatisticsOutput;

    service.statistics('organization-1').subscribe((result) => expect(result).toEqual(statistics));

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions/statistics` &&
        req.params.get('organization') === '/api/organizations/organization-1',
    );
    expect(request.request.method).toBe('GET');
    request.flush(statistics);
  });

  it('uses conditional PUT for offline work-item creation', () => {
    service
      .createWorkItem({
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        source: 'discovered',
        required: false,
      })
      .subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-work-items/work-item-client-id`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-None-Match')).toBe('*');
    expect(request.request.body).not.toHaveProperty('clientId');
    request.flush({});
  });

  it('uses the persisted revision for intervention patches', () => {
    service.update('intervention-1', { status: 'planned' }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-7"');
    request.flush({});
  });

  it('posts a team assignment with the current revision as If-Match', () => {
    service.assignTeam('intervention-1', { teamId: 'team-1' }, 7).subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/interventions/intervention-1/team-assignments`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ teamId: 'team-1' });
    expect(request.request.headers.get('If-Match')).toBe('"revision-7"');
    request.flush({});
  });

  it('sends a DELETE with the current revision as If-Match when deleting an intervention', () => {
    service.remove('intervention-1', 4).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('preserves explicit null values in intervention patches', () => {
    service.update('intervention-1', { responsible: null, dueAt: null }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.body).toEqual({ responsible: null, dueAt: null });
    request.flush({});
  });

  it('loads every work-item page for the field workspace', () => {
    const first = { id: 'work-item-1' } as InterventionWorkItemOutput;
    const second = { id: 'work-item-101' } as InterventionWorkItemOutput;
    let result: readonly InterventionWorkItemOutput[] = [];

    service.listAllWorkItems('intervention-1').subscribe((items) => {
      result = items;
    });

    const firstRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/intervention-work-items` &&
        request.params.get('page') === '1' &&
        request.params.get('itemsPerPage') === '100',
    );
    firstRequest.flush({
      '@id': '/api/intervention-work-items',
      '@type': 'Collection',
      totalItems: 101,
      member: [first],
    });

    const secondRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/intervention-work-items` &&
        request.params.get('page') === '2',
    );
    secondRequest.flush({
      '@id': '/api/intervention-work-items?page=2',
      '@type': 'Collection',
      totalItems: 101,
      member: [second],
    });

    expect(result).toEqual([first, second]);
  });

  it('loads every assigned intervention page for offline prefetch', () => {
    const first = { id: 'intervention-1' } as InterventionOutput;
    const second = { id: 'intervention-101' } as InterventionOutput;
    let result: readonly InterventionOutput[] = [];

    service
      .listAll('organization-1', { responsible: '/api/members/member-1' })
      .subscribe((interventions) => {
        result = interventions;
      });

    const firstRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('page') === '1' &&
        request.params.get('itemsPerPage') === '100' &&
        request.params.get('responsible') === '/api/members/member-1',
    );
    firstRequest.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 101,
      member: [first],
    });

    const secondRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('page') === '2' &&
        request.params.get('responsible') === '/api/members/member-1',
    );
    secondRequest.flush({
      '@id': '/api/interventions?page=2',
      '@type': 'Collection',
      totalItems: 101,
      member: [second],
    });

    expect(result).toEqual([first, second]);
  });

  it('fetches the calendar window as a de-duped union of planned-start and due-date queries', () => {
    const after = new Date(Date.UTC(2026, 5, 1, 0, 0, 0));
    const before = new Date(Date.UTC(2026, 6, 31, 23, 59, 59));
    const shared = { id: 'shared' } as InterventionOutput;
    const dueOnly = { id: 'due-only' } as InterventionOutput;
    let result: readonly InterventionOutput[] = [];

    service.listCalendarWindow('organization-1', after, before).subscribe((interventions) => {
      result = interventions;
    });

    const plannedRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('plannedStartAtAfter') === '2026-06-01T00:00:00Z' &&
        request.params.get('plannedStartAtBefore') === '2026-07-31T23:59:59Z',
    );
    plannedRequest.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 1,
      member: [shared],
    });

    const dueRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/interventions` &&
        request.params.get('dueAtAfter') === '2026-06-01T00:00:00Z' &&
        request.params.get('dueAtBefore') === '2026-07-31T23:59:59Z',
    );
    dueRequest.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 2,
      member: [shared, dueOnly],
    });

    expect(result.map((intervention) => intervention.id).toSorted()).toEqual([
      'due-only',
      'shared',
    ]);
  });

  it('forwards the name filter to the collection endpoint', () => {
    service.list('organization-1', { name: 'Annual' }).subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions` && req.params.get('name') === 'Annual',
    );
    request.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('sends the scalar equals form for a single status value', () => {
    service.list('organization-1', { status: 'draft' }).subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions` && req.params.get('status') === 'draft',
    );
    expect(request.request.params.getAll('status[]')).toBeNull();
    request.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('sends a repeated status[] param for an isAnyOf array of statuses', () => {
    service.list('organization-1', { status: ['draft', 'planned'] }).subscribe();

    const request = httpMock.expectOne(
      (req) => req.url === `${mockEnv.apiUrl}/api/interventions` && req.params.has('status[]'),
    );
    expect(request.request.params.get('status')).toBeNull();
    expect(request.request.params.getAll('status[]')).toEqual(['draft', 'planned']);
    request.flush({
      '@id': '/api/interventions',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('sends description and labelIds on create when provided', () => {
    service
      .create('organization-1', 'Site visit', {
        description: 'Quarterly check',
        labelIds: ['label-1', 'label-2'],
      })
      .subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions`);
    expect(request.request.body).toMatchObject({
      description: 'Quarterly check',
      labelIds: ['label-1', 'label-2'],
    });
    request.flush({});
  });

  it('sends labelIds on update only when explicitly provided (merge-patch replace semantics)', () => {
    service.update('intervention-1', { name: 'Renamed' }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.body).not.toHaveProperty('labelIds');
    request.flush({});
  });

  it('replaces the whole label set when labelIds is provided on update', () => {
    service.update('intervention-1', { labelIds: ['label-3'] }, 7).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1`);
    expect(request.request.body).toEqual({ labelIds: ['label-3'] });
    request.flush({});
  });

  it('loads one page of the activity timeline', () => {
    const activity = {
      id: 'activity-1',
      intervention: '/api/interventions/intervention-1',
      kind: 'comment',
      event: 'comment',
      actor: '/api/organizations/org-1/members/member-1',
      body: 'Looks good',
      payload: null,
      createdAt: '2026-07-01T00:00:00.000Z',
    } as InterventionActivityOutput;
    let result: InterventionActivityOutput[] = [];

    service.listActivities('intervention-1', 2).subscribe((collection) => {
      result = [...collection.member];
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions/intervention-1/activities` &&
        req.params.get('page') === '2',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/interventions/intervention-1/activities',
      '@type': 'Collection',
      totalItems: 1,
      member: [activity],
    });

    expect(result).toEqual([activity]);
  });

  it('posts a comment onto the activity timeline', () => {
    service.addComment('intervention-1', 'Looks good').subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/interventions/intervention-1/comments`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ body: 'Looks good' });
    request.flush({});
  });

  it('creates an intervention with default type/priority/participants when no options are given', () => {
    service.create('organization-1', 'Site visit').subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions`);
    expect(request.request.body).toMatchObject({
      organization: '/api/organizations/organization-1',
      type: 'site_setup',
      name: 'Site visit',
      participants: [],
      priority: 'normal',
    });
    request.flush({});
  });

  it('uses POST for work-item creation when no clientId is provided', () => {
    service
      .createWorkItem({
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        source: 'planned',
        required: true,
      })
      .subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-work-items`);
    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('sends the persisted revision as If-Match when updating a work item', () => {
    service.updateWorkItem('work-item-1', { status: 'completed' }, 2).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-work-items/work-item-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"revision-2"');
    request.flush({});
  });

  it('omits If-Match when no revision is given on work-item update', () => {
    service.updateWorkItem('work-item-1', { status: 'completed' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-work-items/work-item-1`);
    expect(request.request.headers.has('If-Match')).toBe(false);
    request.flush({});
  });

  it('sends a DELETE with the current revision when removing a work item', () => {
    service.removeWorkItem('work-item-1', 3).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-work-items/work-item-1`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('If-Match')).toBe('"revision-3"');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('forwards resource and status filters when listing changes', () => {
    service
      .listChanges('intervention-1', { resource: '/api/equipment/equipment-1', status: 'open' })
      .subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/intervention-changes` &&
        req.params.get('resource') === '/api/equipment/equipment-1' &&
        req.params.get('status') === 'open',
    );
    request.flush({
      '@id': '/api/intervention-changes',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('loads every change page', () => {
    service.listAllChanges('intervention-1').subscribe();

    const firstRequest = httpMock.expectOne(
      (request) =>
        request.url === `${mockEnv.apiUrl}/api/intervention-changes` &&
        request.params.get('page') === '1',
    );
    firstRequest.flush({
      '@id': '/api/intervention-changes',
      '@type': 'Collection',
      totalItems: 1,
      member: [{ id: 'change-1' }],
    });
  });

  it('uses conditional PUT for offline change creation and POST otherwise', () => {
    service
      .createChange({
        clientId: 'change-client-id',
        intervention: '/api/interventions/intervention-1',
        resource: '/api/equipment/equipment-1',
        patch: { status: 'replaced' },
      })
      .subscribe();

    const putRequest = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-changes/change-client-id`,
    );
    expect(putRequest.request.method).toBe('PUT');
    expect(putRequest.request.headers.get('If-None-Match')).toBe('*');
    putRequest.flush({});

    service
      .createChange({
        intervention: '/api/interventions/intervention-1',
        resource: '/api/equipment/equipment-1',
        patch: { status: 'replaced' },
      })
      .subscribe();

    const postRequest = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-changes`);
    expect(postRequest.request.method).toBe('POST');
    postRequest.flush({});
  });

  it('sends the persisted revision as If-Match when updating a change', () => {
    service.updateChange('change-1', { patch: { status: 'updated' } }, 4).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/intervention-changes/change-1`);
    expect(request.request.headers.get('If-Match')).toBe('"revision-4"');
    request.flush({});
  });

  it('loads intervention quality issues', () => {
    service.listIssues('intervention-1').subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1/issues`);
    expect(request.request.method).toBe('GET');
    request.flush({
      '@id': '/api/interventions/intervention-1/issues',
      '@type': 'Collection',
      totalItems: 0,
      member: [],
    });
  });

  it('publishes an intervention at its current revision', () => {
    const intervention = { id: 'intervention-1', revision: 5 } as InterventionOutput;
    service.publish(intervention).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/publications`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      intervention: '/api/interventions/intervention-1',
      interventionRevision: 5,
    });
    request.flush({});
  });

  it('polls a running publication until it settles', () => {
    vi.useFakeTimers();
    const running = { id: 'publication-1', status: 'processing' } as PublicationOutput;
    const settled = { id: 'publication-1', status: 'completed' } as PublicationOutput;
    let result: PublicationOutput | undefined;

    service.pollPublication(running).subscribe((publication) => {
      result = publication;
    });

    vi.advanceTimersByTime(1_000);
    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/publications/publication-1`);
    request.flush(settled);

    expect(result).toEqual(settled);
    vi.useRealTimers();
  });

  it('reads an attachment as a blob via GET responseType blob', () => {
    const content = new Blob(['file-bytes'], { type: 'application/pdf' });
    let result: Blob | undefined;

    service.downloadAttachment('attachment-1').subscribe((blob) => {
      result = blob;
    });

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/intervention-attachments/attachment-1/download`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });

  it('reads the intervention report as a blob via GET responseType blob', () => {
    const content = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    let result: Blob | undefined;

    service.exportReport('intervention-1').subscribe((blob) => {
      result = blob;
    });

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/interventions/intervention-1/report`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });

  it('reads the CSV export as a blob, scoped by organization', () => {
    const content = new Blob(['csv-bytes'], { type: 'text/csv' });
    let result: Blob | undefined;

    service.exportCsv('organization-1').subscribe((blob) => {
      result = blob;
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions/export` &&
        req.params.get('organization') === '/api/organizations/organization-1',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(content);

    expect(result).toEqual(content);
  });

  it('forwards a scalar filter as key= and an array filter as repeated key[]=', () => {
    service
      .exportCsv('organization-1', {
        status: ['planned', 'in_progress'],
        name: 'sweep',
        due: 'overdue',
      })
      .subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === `${mockEnv.apiUrl}/api/interventions/export` &&
        req.params.getAll('status[]')?.join(',') === 'planned,in_progress' &&
        req.params.get('name') === 'sweep' &&
        req.params.get('due') === 'overdue',
    );
    expect(request.request.method).toBe('GET');
    request.flush(new Blob(['csv-bytes'], { type: 'text/csv' }));
  });

  it('uploads an attachment scoped to a work item via the workItemId multipart field', () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    service
      .uploadAttachment('intervention-1', file, 'evidence.jpg', undefined, 'work-item-1')
      .subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/interventions/intervention-1/attachments`,
    );
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('file')).toBeInstanceOf(Blob);
    expect(body.get('workItemId')).toBe('work-item-1');
    expect(body.has('label')).toBe(false);
    request.flush({});
  });

  it('omits the workItemId multipart field for a plain intervention-level upload', () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    service.uploadAttachment('intervention-1', file, 'evidence.jpg').subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/interventions/intervention-1/attachments`,
    );
    const body = request.request.body as FormData;
    expect(body.has('workItemId')).toBe(false);
    request.flush({});
  });

  it('lists attachments narrowed to one work item via the workItem query param', () => {
    service.listAttachments('intervention-1', 'work-item-1').subscribe();

    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/interventions/intervention-1/attachments?workItem=work-item-1`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ member: [], totalItems: 0 });
  });
});
