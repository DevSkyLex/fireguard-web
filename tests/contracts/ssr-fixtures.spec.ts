import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createContractValidator, loadOpenApi } from './support/openapi';

const require = createRequire(import.meta.url);
const { createApiStub } = require('../e2e/ssr/api-stub.cjs');
const api = createApiStub('http://127.0.0.1:4274');
const server = createServer(api.handler);
const contract = loadOpenApi();
const validator = createContractValidator(contract);
let origin: string;

beforeAll(async () => {
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No isolated HTTP stub port.');
  origin = 'http://127.0.0.1:' + address.port;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
});

describe('versioned API reference', () => {
  it('has an independently recorded source fingerprint', () => {
    const snapshot = JSON.parse(
      readFileSync(new URL('./fixtures/openapi.json', import.meta.url), 'utf8'),
    );
    const source = JSON.parse(
      readFileSync(new URL('./fixtures/source.json', import.meta.url), 'utf8'),
    );
    expect(
      createHash('sha256')
        .update(JSON.stringify(snapshot, null, 2) + '\n')
        .digest('hex'),
    ).toBe(source.sha256);
    expect(source.repository).toBe('DevSkyLex/fireguard-api');
  });

  it('matches the canonical local API export when the sibling repository is present', () => {
    const source = fileURLToPath(new URL('../../../fireguard-api/openapi.json', import.meta.url));
    if (existsSync(source)) expect(contract).toEqual(JSON.parse(readFileSync(source, 'utf8')));
    else
      expect(
        process.env['CI'],
        'Missing sibling API: use FIREGUARD_OPENAPI_PATH or restore the local API checkout.',
      ).toBeTruthy();
  });
});

describe('real SSR HTTP fixtures', () => {
  it('validates anonymous refresh denial as a documented problem response', async () => {
    const response = await fetch(origin + '/api/auth/refresh', { method: 'POST' });
    expect(response.status).toBe(401);
    validator.response(
      'POST',
      '/api/auth/refresh',
      response.status,
      response.headers.get('content-type') ?? '',
      await response.json(),
    );
  });
  it('validates every registered authenticated API response against canonical routes and schemas', async () => {
    const headers = {
      authorization: 'Bearer e2e-access-token',
      'content-type': 'application/ld+json',
    };
    await fetch(origin + '/api/me', { headers });
    const fixtures = [...api.fixtures.values()] as {
      method: string;
      path: string;
      status: number;
    }[];
    expect(fixtures.length).toBeGreaterThan(20);
    const errors: string[] = [];
    await Promise.all(
      fixtures.map(async (fixture) => {
        const response = await fetch(origin + fixture.path, { method: fixture.method, headers });
        const body = await response.json();
        try {
          validator.response(
            fixture.method,
            fixture.path,
            response.status,
            response.headers.get('content-type') ?? '',
            body,
          );
        } catch (error) {
          errors.push(String(error));
        }
      }),
    );
    expect(api.unexpected).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  it('detects real presence response drift and a removed heartbeat endpoint', () => {
    expect(() =>
      validator.response('POST', '/api/presence', 200, 'application/ld+json', {}),
    ).toThrow(/method absent/);
    expect(() =>
      validator.response('GET', '/api/me/presence-preference', 200, 'application/ld+json', {
        doNotDisturb: 'false',
        invisible: false,
        revision: 0,
      }),
    ).toThrow(/boolean/);
  });
});
