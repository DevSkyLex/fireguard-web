/**
 * Function createApiStub
 * @description Creates the SSR smoke's bounded anonymous API, shared by Node SSR and browsers.
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
      status: fixture?.status ?? 501,
    };
    if (!fixture || url.search || (origin && origin !== appOrigin)) {
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
