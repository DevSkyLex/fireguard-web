import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ChannelOutput,
  ListChannelsQuery,
} from '@features/organization/features/collaboration/models';
import { ChannelService } from '../channel.service';

function channel(overrides: Partial<ChannelOutput> = {}): ChannelOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ChannelOutput',
    id: 'channel-1',
    organization: '/api/organizations/org-1',
    name: 'Bâtiment Nord',
    participantCount: 4,
    isArchived: false,
    messagesCount: 12,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-02T00:00:00+00:00',
    isFavorite: false,
    ...overrides,
  };
}

function collection(
  member: readonly ChannelOutput[],
  totalItems = member.length,
): HydraCollection<ChannelOutput> {
  return {
    '@id': '/api/channels',
    '@type': 'Collection',
    member: [...member],
    totalItems,
  } as HydraCollection<ChannelOutput>;
}

describe('ChannelService', () => {
  let service: ChannelService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const channelsUrl = `${mockEnv.apiUrl}/api/channels`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChannelService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(ChannelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const query: ListChannelsQuery = { organization: '/api/organizations/org-1' };

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request scoped to the organization and return one page', () => {
      service.list(query).subscribe((response) => {
        expect(response.member).toEqual([channel()]);
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url === channelsUrl && request.params.get('organization') === query.organization,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(collection([channel()]));
    });

    it('should omit isArchived entirely when the caller does not set it', () => {
      service.list(query).subscribe();

      const req = httpMock.expectOne(
        (request) => request.url === channelsUrl && !request.params.has('isArchived'),
      );
      req.flush(collection([]));
    });

    it('should send isArchived when the caller sets it, even to false', () => {
      service.list({ ...query, isArchived: false }).subscribe();

      const req = httpMock.expectOne(
        (request) => request.url === channelsUrl && request.params.get('isArchived') === 'false',
      );
      req.flush(collection([]));
    });
  });

  // ── listAll ────────────────────────────────────────────────────────────────

  describe('listAll', () => {
    it('should walk every server page and emit the concatenated channel list', () => {
      const firstPage = Array.from({ length: 100 }, (_unused, index) =>
        channel({ id: `channel-${index + 1}`, name: `Channel ${index + 1}` }),
      );
      const secondChannel = channel({ id: 'channel-101', name: 'Channel 101' });
      let result: readonly ChannelOutput[] = [];

      service.listAll(query).subscribe((channels) => {
        result = channels;
      });

      const firstRequest = httpMock.expectOne(
        (request) =>
          request.url === channelsUrl &&
          request.params.get('page') === '1' &&
          request.params.get('itemsPerPage') === '100',
      );
      firstRequest.flush(collection(firstPage, 101));

      const secondRequest = httpMock.expectOne(
        (request) => request.url === channelsUrl && request.params.get('page') === '2',
      );
      secondRequest.flush(collection([secondChannel], 101));

      expect(result).toHaveLength(101);
      expect(result.at(-1)).toEqual(secondChannel);
    });

    it('should stop after a single page when the collection fits in it, so the sidebar and the channels page filter every row rather than only the first 30', () => {
      let result: readonly ChannelOutput[] = [];

      service.listAll(query).subscribe((channels) => {
        result = channels;
      });

      const req = httpMock.expectOne(
        (request) => request.url === channelsUrl && request.params.get('page') === '1',
      );
      req.flush(collection([channel()]));

      expect(result).toEqual([channel()]);
    });

    it('should carry the archive filter onto every page it walks', () => {
      const secondChannel = channel({ id: 'channel-101', isArchived: true });

      service.listAll({ ...query, isArchived: true }).subscribe();

      const firstRequest = httpMock.expectOne(
        (request) => request.url === channelsUrl && request.params.get('page') === '1',
      );
      expect(firstRequest.request.params.get('isArchived')).toBe('true');
      firstRequest.flush(
        collection(
          Array.from({ length: 100 }, (_unused, index) => channel({ id: `channel-${index + 1}` })),
          101,
        ),
      );

      const secondRequest = httpMock.expectOne(
        (request) => request.url === channelsUrl && request.params.get('page') === '2',
      );
      expect(secondRequest.request.params.get('isArchived')).toBe('true');
      secondRequest.flush(collection([secondChannel], 101));
    });
  });

  // ── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should send GET request and return one channel', () => {
      service.get('channel-1').subscribe((result) => {
        expect(result.id).toBe('channel-1');
      });

      const req = httpMock.expectOne(`${channelsUrl}/channel-1`);
      expect(req.request.method).toBe('GET');
      req.flush(channel());
    });
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should send POST request and return the created channel', () => {
      const input = { organization: query.organization, name: 'New channel' };

      service.create(input).subscribe((result) => {
        expect(result.name).toBe('Bâtiment Nord');
      });

      const req = httpMock.expectOne(channelsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(channel());
    });
  });
});
