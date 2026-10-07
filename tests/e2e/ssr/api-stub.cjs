require('../scripts/register-typescript.cjs');
const {
  E2E_ACCESS_TOKEN,
  loginOutput,
  userProfileOutput,
  organizationOutput,
  currentOrganizationMemberProfileOutput,
  onboardingOutput,
  hydraCollection,
  organizationNavigationCountersOutput,
  mercureSubscriptionOutput,
} = require('../support/fixtures/api-fixtures.ts');

/**
 * Function createApiStub
 * @description Creates the SSR smoke's bounded anonymous and authenticated API fixtures.
 * Unknown methods/paths are recorded as harness failures; no request is forwarded.
 * @access public
 * @since 1.0.0
 * @param {string} appOrigin - Only browser origin allowed to read the local API.
 * @param {Function} [onShutdown] - Optional launcher-only teardown callback.
 * @returns {{ handler: Function; requests: object[]; unexpected: object[] }} Local handler and request evidence.
 */
function createApiStub(appOrigin, onShutdown) {
  const requests = [];
  const unexpected = [];
  const registeredFixtures = new Map();
  const caseFixtures = new Map();
  const handler = (request, response) => {
    const url = new URL(request.url, 'https://127.0.0.1');
    const origin = request.headers.origin;
    if (origin === appOrigin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/ld+json');
    if (
      onShutdown &&
      request.method === 'POST' &&
      url.pathname === '/__harness/shutdown' &&
      !url.search &&
      !origin
    ) {
      response.end(JSON.stringify({ stopped: true }));
      setImmediate(onShutdown);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/__harness/health') {
      response.end(JSON.stringify({ harness: 'fireguard-ssr', pid: process.pid }));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/__harness/requests') {
      response.end(JSON.stringify({ requests, unexpected }));
      return;
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/__harness/fixtures' &&
      !url.search &&
      !origin
    ) {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        try {
          if (body.length > 1_048_576) throw new Error('Fixture payload is too large.');
          const input = JSON.parse(body);
          if (!Array.isArray(input.fixtures) || input.fixtures.length > 20)
            throw new Error('A bounded fixture list is required.');
          const next = new Map();
          for (const fixture of input.fixtures) {
            if (
              fixture.method !== 'GET' ||
              typeof fixture.path !== 'string' ||
              !/^\/api\/organizations\/e2e-org-1\/[a-zA-Z0-9_/-]+$/.test(fixture.path) ||
              next.has(`GET ${fixture.path}`) ||
              !Object.hasOwn(fixture, 'body') ||
              (fixture.query !== undefined &&
                (typeof fixture.query !== 'object' ||
                  fixture.query === null ||
                  Array.isArray(fixture.query) ||
                  Object.values(fixture.query).some((value) => typeof value !== 'string')))
            )
              throw new Error(
                'Fixtures require distinct exact organization GET paths and queries.',
              );
            next.set(`GET ${fixture.path}`, {
              status: 200,
              body: fixture.body,
              query: fixture.query ?? {},
            });
          }
          caseFixtures.clear();
          for (const [key, fixture] of next) caseFixtures.set(key, fixture);
          response.end(JSON.stringify({ registered: caseFixtures.size }));
        } catch (error) {
          response.writeHead(422);
          response.end(JSON.stringify({ title: error.message }));
        }
      });
      return;
    }
    const routes = new Map([
      [
        'POST /api/auth/refresh',
        {
          status: 401,
          body: { status: 401, title: 'No smoke session', detail: 'Anonymous SSR fixture.' },
        },
      ],
      [
        'POST /api/auth/login',
        {
          status: 401,
          body: {
            status: 401,
            title: 'Invalid credentials',
            detail: 'SSR smoke rejects these fixture credentials.',
          },
        },
      ],
      [
        'GET /api/auth/federated/providers',
        {
          status: 200,
          body: { '@id': '/api/auth/federated/providers', member: [], totalItems: 0 },
        },
      ],
    ]);
    const authenticated =
      (request.headers.cookie ?? '').includes('refresh_token=ssr-harness-session') ||
      request.headers.authorization === 'Bearer ' + E2E_ACCESS_TOKEN ||
      (request.method === 'OPTIONS' && origin === appOrigin);
    if (authenticated) {
      const org = '/api/organizations/e2e-org-1';
      const fixtures = [
        ['POST /api/auth/refresh', loginOutput()],
        ['GET /api/me', userProfileOutput()],
        [
          'GET /api/me/presence-preference',
          {
            '@id': '/api/me/presence-preference',
            '@type': 'PresencePreference',
            doNotDisturb: false,
            invisible: false,
            revision: 0,
          },
        ],
        [
          'GET /api/me/presence-preference/subscription',
          {
            ...mercureSubscriptionOutput({ topic: '/users/e2e-user-1/presence-preference' }),
            '@id': '/api/me/presence-preference/subscription',
            '@type': 'PresencePreference',
            expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          },
        ],
        ['GET /api/onboarding/organization', onboardingOutput()],
        ['GET /api/organizations', hydraCollection([organizationOutput()])],
        [`GET ${org}`, organizationOutput()],
        [
          `GET ${org}/me`,
          currentOrganizationMemberProfileOutput({
            permissions: [
              'organization.read',
              'organization.webhooks.read',
              'organization.automation.read',
              'organization.service_requests.read',
              'organization.service_requests.create',
              'organization.service_requests.manage',
              'organization.inventory.read',
              'organization.inventory.manage',
              'organization.inventory.consume',
              'organization.procurement.read',
              'organization.procurement.manage',
              'organization.maintenance_cost.read',
              'organization.maintenance_cost.manage',
              'organization.maintenance_exports.read',
              'organization.maintenance_exports.manage',
              'organization.maintenance_exports.confirm',
            ],
          }),
        ],
        [`GET ${org}/navigation-counters`, organizationNavigationCountersOutput()],
        ['GET /api/notifications', hydraCollection([])],
        ['GET /api/notification-types', hydraCollection([])],
        [
          'GET /api/notifications/unread-count',
          {
            '@id': '/api/notifications/unread-count',
            '@type': 'NotificationUnreadCount',
            unreadCount: 0,
          },
        ],
        [
          'GET /api/inbox/unread-count',
          { '@id': '/api/inbox/unread-count', '@type': 'InboxUnreadCount', unreadCount: 0 },
        ],
        ['GET /api/notifications/subscription', mercureSubscriptionOutput()],
        [
          'GET /api/inbox',
          {
            '@id': '/api/inbox',
            '@type': 'Inbox',
            items: [],
            complete: true,
            hasMore: false,
            nextPageCursor: null,
          },
        ],
        ['GET /api/channels', hydraCollection([])],
        ['GET /api/direct-conversations', hydraCollection([])],
        ['GET /api/interventions', hydraCollection([])],
        [`GET ${org}/members`, hydraCollection([])],
        [
          'POST /api/presence/ping',
          {
            '@id': '/api/presence/ping',
            '@type': 'Presence',
            memberId: currentOrganizationMemberProfileOutput().id,
            lastSeenAt: new Date().toISOString(),
          },
        ],
        [`GET ${org}/webhooks`, hydraCollection([], { '@id': `${org}/webhooks` })],
        [
          `GET ${org}/automation`,
          {
            '@id': `${org}/automation`,
            '@type': 'AutomationPolicy',
            id: 'e2e-org-1',
            ruleKey: 'auto_create_intervention_on_critical_nc',
            enabled: true,
            canManage: false,
          },
        ],
        [`GET ${org}/automation/runs`, hydraCollection([], { '@id': `${org}/automation/runs` })],
      ];
      for (const [key, body] of fixtures) routes.set(key, { status: 200, body, allowQuery: true });
      for (const [key, fixture] of caseFixtures) routes.set(key, fixture);
      routes.set('GET /.well-known/mercure', { status: 204, body: null, allowQuery: true });
    }
    if (
      url.pathname === '/.well-known/mercure' &&
      url.searchParams.get('authorization') === 'e2e-mercure-token'
    ) {
      routes.set('GET /.well-known/mercure', { status: 204, body: null, allowQuery: true });
    }
    const method =
      request.method === 'OPTIONS'
        ? request.headers['access-control-request-method']
        : request.method;
    for (const [key, fixture] of routes) {
      if (!key.includes(' /api/')) continue;
      const [fixtureMethod, fixturePath] = key.split(' ');
      registeredFixtures.set(key, {
        method: fixtureMethod,
        path: fixturePath,
        status: fixture.status,
      });
    }
    const fixture = routes.get(`${method} ${url.pathname}`);
    const exactQuery =
      !fixture?.query ||
      (Object.keys(fixture.query).length === [...url.searchParams].length &&
        Object.entries(fixture.query).every(
          ([key, value]) =>
            url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === value,
        ));
    const entry = {
      method: request.method,
      path: url.pathname,
      query: url.search,
      at: new Date().toISOString(),
      origin: origin ?? null,
      status: fixture?.status ?? 501,
    };
    if (
      !fixture ||
      !exactQuery ||
      (url.search && !fixture.allowQuery && !fixture.query) ||
      (origin && origin !== appOrigin)
    ) {
      entry.status = 501;
      requests.push(entry);
      unexpected.push(entry);
      response.writeHead(501);
      response.end(
        JSON.stringify({
          title: `No SSR E2E mock registered for ${request.method} ${url.pathname}${url.search}`,
        }),
      );
      return;
    }
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', method);
      response.setHeader(
        'Access-Control-Allow-Headers',
        request.headers['access-control-request-headers'] ?? 'content-type',
      );
      response.writeHead(204).end();
      return;
    }
    requests.push(entry);
    response.setHeader(
      'Content-Type',
      fixture.status >= 400 ? 'application/problem+json' : 'application/ld+json',
    );
    response.writeHead(fixture.status);
    response.end(JSON.stringify(fixture.body));
  };
  return { handler, requests, unexpected, fixtures: registeredFixtures };
}

module.exports = { createApiStub };
