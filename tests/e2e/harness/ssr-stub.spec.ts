import { createServer, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_ACCESS_TOKEN } from '../support/fixtures/api-fixtures';

const loadModule = createRequire(resolve('tests/e2e/harness/ssr-stub.spec.ts'));
const { createApiStub } = loadModule('../ssr/api-stub.cjs') as {
  createApiStub: (origin: string) => {
    handler: Parameters<typeof createServer>[0];
    requests: { method: string; path: string; status: number }[];
    unexpected: object[];
  };
};

test('serves the real HTTP stub locally and records wrong methods and endpoints', async ({
  request,
}) => {
  const stub = createApiStub('http://127.0.0.1:4274');
  const server = createServer(stub.handler);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No local stub port.');
    const origin = `http://127.0.0.1:${address.port}`;
    expect((await request.post(`${origin}/api/auth/refresh`)).status()).toBe(401);
    expect((await request.get(`${origin}/api/auth/federated/providers`)).status()).toBe(200);
    expect((await request.get(`${origin}/api/auth/refresh`)).status()).toBe(501);
    expect((await request.post(`${origin}/api/unregistered`)).status()).toBe(501);
    const ledger = await (await request.get(`${origin}/__harness/requests`)).json();
    expect(ledger.requests).toHaveLength(4);
    expect(ledger.unexpected).toHaveLength(2);
    expect(ledger.unexpected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/api/auth/refresh' }),
      ]),
    );
    const headers = { authorization: 'Bearer ' + E2E_ACCESS_TOKEN };
    const preference = await request.get(origin + '/api/me/presence-preference', { headers });
    expect(preference.status()).toBe(200);
    expect(await preference.json()).toMatchObject({
      doNotDisturb: false,
      invisible: false,
      revision: 0,
    });
    const subscription = await request.get(origin + '/api/me/presence-preference/subscription', {
      headers,
    });
    expect(subscription.status()).toBe(200);
    expect(await subscription.json()).toMatchObject({
      topic: '/users/e2e-user-1/presence-preference',
      token: 'e2e-mercure-token',
      expiresAt: expect.any(String),
    });
    const heartbeat = await request.post(origin + '/api/presence/ping', {
      headers,
      data: { organization: 'e2e-org-1' },
    });
    expect(heartbeat.status()).toBe(200);
    expect(await heartbeat.json()).toMatchObject({
      memberId: 'e2e-member-1',
      lastSeenAt: expect.any(String),
    });
    const preflight = await request.fetch(origin + '/api/me/presence-preference', {
      method: 'OPTIONS',
      headers: { origin: 'http://127.0.0.1:4274', 'access-control-request-method': 'GET' },
    });
    expect(preflight.status()).toBe(204);
    expect(
      (await (await request.get(origin + '/__harness/requests')).json()).unexpected,
    ).toHaveLength(2);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});

test('keeps the authenticated Mercure stream open with exact origin CORS', async ({
  page,
}, info) => {
  const documentServer = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<p>SSE harness</p>');
  });
  await new Promise<void>((done) => documentServer.listen(0, '127.0.0.1', done));
  let server: ReturnType<typeof createServer> | undefined;
  let stream: ServerResponse | undefined;
  let finished = false;
  let closed = false;
  try {
    const documentAddress = documentServer.address();
    if (!documentAddress || typeof documentAddress === 'string')
      throw new Error('No local document port.');
    const appOrigin = 'http://127.0.0.1:' + documentAddress.port;
    const stub = createApiStub(appOrigin);
    server = createServer(stub.handler);
    server.on('request', (request, response) => {
      if (!request.url?.startsWith('/.well-known/mercure?')) return;
      stream = response;
      response.once('finish', () => {
        finished = true;
      });
      response.once('close', () => {
        closed = true;
      });
    });
    const apiServer = server;
    await new Promise<void>((done) => apiServer.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No local stub port.');
    const apiOrigin = 'http://127.0.0.1:' + address.port;
    await page.goto(appOrigin + '/');
    const hub = new URL('/.well-known/mercure', apiOrigin);
    hub.searchParams.set('topic', '/users/e2e-user-1/presence-preference');
    hub.searchParams.set('authorization', 'e2e-mercure-token');
    const state = await page.evaluateHandle((url) => {
      const source = new EventSource(url);
      const state = { source, errors: 0 };
      source.addEventListener('error', () => state.errors++);
      return state;
    }, hub.toString());
    try {
      const connection = await state.evaluate(
        (state) =>
          new Promise<{ open: boolean; credentials: boolean; errors: number }>((resolve) => {
            const { source } = state;
            const snapshot = () => ({
              open: source.readyState === EventSource.OPEN,
              credentials: source.withCredentials,
              errors: state.errors,
            });
            if (source.readyState !== EventSource.CONNECTING) return resolve(snapshot());
            const onOpen = () => {
              source.removeEventListener('error', onError);
              resolve(snapshot());
            };
            const onError = () => {
              source.removeEventListener('open', onOpen);
              resolve(snapshot());
            };
            source.addEventListener('open', onOpen, { once: true });
            source.addEventListener('error', onError, { once: true });
          }),
      );
      await info.attach('mercure-transport', {
        body: JSON.stringify({
          connection,
          status: stream?.statusCode,
          headers: stream?.getHeaders(),
        }),
        contentType: 'application/json',
      });
      expect(connection).toEqual({ open: true, credentials: false, errors: 0 });
      if (!stream) throw new Error('Mercure must reach the real local HTTP stub.');
      expect(stream.statusCode).toBe(200);
      expect(stream.getHeader('Content-Type')).toMatch(/^text\/event-stream\b/);
      expect(stream.getHeader('Access-Control-Allow-Origin')).toBe(appOrigin);
      expect(stream.getHeader('Access-Control-Allow-Credentials')).toBe('true');
      expect(stream.getHeader('Vary')).toBe('Origin');
      await page.evaluate(
        async (url) => (await fetch(url)).text(),
        apiOrigin + '/__harness/health',
      );
      expect(
        await state.evaluate(({ source, errors }) => ({
          open: source.readyState === EventSource.OPEN,
          credentials: source.withCredentials,
          errors,
        })),
      ).toEqual({ open: true, credentials: false, errors: 0 });
      expect(stream.writableEnded).toBe(false);
      expect(stream.destroyed).toBe(false);
      expect(finished).toBe(false);
      expect(closed).toBe(false);
      expect(stub.requests).toEqual([
        expect.objectContaining({ method: 'GET', path: '/.well-known/mercure', status: 200 }),
      ]);
      expect(stub.unexpected).toEqual([]);
      await state.evaluate(({ source }) => source.close());
      expect(await state.evaluate(({ source }) => source.readyState === EventSource.CLOSED)).toBe(
        true,
      );
      await expect.poll(() => closed).toBe(true);
      expect(finished).toBe(false);
    } finally {
      await state.evaluate(({ source }) => source.close()).catch(() => undefined);
      await state.dispose();
    }
  } finally {
    if (server) {
      const apiServer = server;
      apiServer.closeAllConnections();
      await new Promise<void>((done) => apiServer.close(() => done()));
    }
    documentServer.closeAllConnections();
    await new Promise<void>((done) => documentServer.close(() => done()));
  }
});
