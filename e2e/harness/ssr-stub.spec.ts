import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const loadModule = createRequire(resolve('e2e/harness/ssr-stub.spec.ts'));
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
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
