require('../scripts/register-typescript.cjs');
const {
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
  const handler = (request, response) => {
    const url = new URL(request.url, 'https://127.0.0.1');
    const origin = request.headers.origin;
    if (origin === appOrigin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
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
      request.headers.authorization === 'Bearer e2e-access-token' ||
      (request.method === 'OPTIONS' && origin === appOrigin);
    if (authenticated) {
      const org = '/api/organizations/e2e-org-1';
      const fixtures = [
        ['POST /api/auth/refresh', loginOutput()],
        ['GET /api/me', userProfileOutput()],
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
            ],
          }),
        ],
        [`GET ${org}/navigation-counters`, organizationNavigationCountersOutput()],
        ['GET /api/notifications', hydraCollection([])],
        ['GET /api/notification-types', hydraCollection([])],
        ['GET /api/notifications/unread-count', { unreadCount: 0 }],
        ['GET /api/inbox/unread-count', { unreadCount: 0 }],
        ['GET /api/notifications/subscription', mercureSubscriptionOutput()],
        ['GET /api/inbox', { items: [], complete: true, hasMore: false, nextPageCursor: null }],
        ['GET /api/channels', hydraCollection([])],
        ['GET /api/direct-conversations', hydraCollection([])],
        ['GET /api/interventions', hydraCollection([])],
        [`GET ${org}/members`, hydraCollection([])],
        ['POST /api/presence', {}],
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
    const fixture = routes.get(`${method} ${url.pathname}`);
    const entry = {
      method: request.method,
      path: url.pathname,
      query: url.search,
      at: new Date().toISOString(),
      origin: origin ?? null,
      status: fixture?.status ?? 501,
    };
    if (!fixture || (url.search && !fixture.allowQuery) || (origin && origin !== appOrigin)) {
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
    response.writeHead(fixture.status);
    response.end(JSON.stringify(fixture.body));
  };
  return { handler, requests, unexpected };
}

module.exports = { createApiStub };
