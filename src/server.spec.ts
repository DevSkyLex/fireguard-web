import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

const { handle, writeAngularResponse } = vi.hoisted(() => ({
  handle: vi.fn(),
  writeAngularResponse: vi.fn(),
}));

vi.mock('@angular/ssr/node', () => ({
  AngularNodeAppEngine: class {
    public handle = handle;
  },
  createNodeRequestHandler: (app: unknown): unknown => app,
  isMainModule: (): boolean => false,
  writeResponseToNodeResponse: writeAngularResponse,
}));

import { drainServer, reqHandler } from './server';

describe('SSR public runtime configuration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer(reqHandler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    handle.mockReset().mockResolvedValue(null);
    writeAngularResponse
      .mockReset()
      .mockImplementation((_response: unknown, nodeResponse: ServerResponse) => {
        nodeResponse.statusCode = 201;
        nodeResponse.end('rendered');
      });
  });

  it('returns 404 when the container has no runtime override', async () => {
    vi.stubEnv('FIREGUARD_RUNTIME_CONFIG', 'false');

    const response = await fetch(`${baseUrl}/runtime-config.json`);

    expect(response.status).toBe(404);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('checks readiness without rendering Angular or resolving runtime configuration', async () => {
    vi.stubEnv('FIREGUARD_RUNTIME_CONFIG', 'true');
    vi.stubEnv('APP_API_URL', '');
    const response = await fetch(`${baseUrl}/healthz`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(handle).not.toHaveBeenCalled();
  });

  it('serves only public configuration with strict cache and framing headers', async () => {
    vi.stubEnv('FIREGUARD_RUNTIME_CONFIG', 'true');
    vi.stubEnv('APP_API_URL', 'https://api.example.test');
    vi.stubEnv('APP_NAME', 'Fireguard');
    vi.stubEnv('APP_MERCURE_HUB_URL', 'https://mercure.example.test');
    vi.stubEnv('APP_MAINTENANCE', 'false');

    const response = await fetch(`${baseUrl}/runtime-config.json`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, must-revalidate');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'none'");
    expect(await response.json()).toEqual({
      production: true,
      apiUrl: 'https://api.example.test',
      appName: 'Fireguard',
      mercureHubUrl: 'https://mercure.example.test',
      maintenance: false,
    });
  });

  it('rejects an incomplete public runtime configuration', async () => {
    vi.stubEnv('FIREGUARD_RUNTIME_CONFIG', 'true');
    vi.stubEnv('APP_API_URL', '');

    const response = await fetch(`${baseUrl}/runtime-config.json`);

    expect(response.status).toBe(500);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('biases SSR language toward the explicit cookie and keeps the response private', async () => {
    handle.mockImplementation(async (request: { headers: Record<string, string> }) => {
      expect(request.headers['accept-language']).toBe('fr,es-ES,es;q=0.9');
      return { rendered: true };
    });

    const response = await fetch(`${baseUrl}/fr/dashboard`, {
      headers: { Cookie: 'lang=fr', 'Accept-Language': 'es-ES,es;q=0.9' },
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store, must-revalidate');
    expect(await response.text()).toBe('rendered');
    expect(writeAngularResponse).toHaveBeenCalledOnce();
  });

  it('redirects a locale-less navigation while preserving its path and query', async () => {
    const response = await fetch(`${baseUrl}/dashboard?tab=alerts`, {
      headers: { Cookie: 'lang=fr', 'Accept-Language': 'es' },
      redirect: 'manual',
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/fr/dashboard?tab=alerts');
    expect(handle).toHaveBeenCalledOnce();
  });

  it('uses Accept-Language when the cookie is unsupported', async () => {
    const response = await fetch(`${baseUrl}/dashboard`, {
      headers: { Cookie: 'lang=de', 'Accept-Language': 'es-ES,es;q=0.9' },
      redirect: 'manual',
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/es/dashboard');
  });

  it('leaves POST, assets and already localized paths for their own handlers', async () => {
    const [post, asset, localized] = await Promise.all([
      fetch(`${baseUrl}/dashboard`, { method: 'POST' }),
      fetch(`${baseUrl}/missing.js`),
      fetch(`${baseUrl}/fr/dashboard`),
    ]);

    expect(post.status).toBe(404);
    expect(asset.status).toBe(404);
    expect(localized.status).toBe(404);
    expect(handle).toHaveBeenCalledTimes(3);
  });
});

describe('SSR process shutdown', () => {
  it('drains a request already accepted before shutdown', async () => {
    let finish: (() => void) | undefined;
    let acceptedRequest: (() => void) | undefined;
    const accepted = new Promise<void>((resolve) => {
      acceptedRequest = resolve;
    });
    const local = createServer((_request, response) => {
      finish = () => response.end('finished');
      acceptedRequest?.();
    });
    await new Promise<void>((resolve) => local.listen(0, '127.0.0.1', resolve));
    const pending = fetch(`http://127.0.0.1:${(local.address() as AddressInfo).port}`);
    await accepted;
    const stopped = drainServer(local);
    finish?.();
    expect(await (await pending).text()).toBe('finished');
    expect(await stopped).toBe(true);
  });

  it('bounds shutdown when a request never completes', async () => {
    let accepted: (() => void) | undefined;
    const received = new Promise<void>((resolve) => {
      accepted = resolve;
    });
    const local = createServer(() => accepted?.());
    await new Promise<void>((resolve) => local.listen(0, '127.0.0.1', resolve));
    const pending = fetch(`http://127.0.0.1:${(local.address() as AddressInfo).port}`).catch(
      () => null,
    );
    await received;
    expect(await drainServer(local, 10)).toBe(false);
    await pending;
  });
});
