import type { EnvironmentConfig } from '../environment-config.interface';
import { loadBrowserRuntimeEnvironment } from '../runtime-env.browser';

const RUNTIME_ENVIRONMENT: EnvironmentConfig = {
  production: true,
  apiUrl: 'https://dev.api.fireguard.valentin-fortin.pro',
  appName: 'Fireguard',
  mercureHubUrl: 'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
  maintenance: false,
};

describe('loadBrowserRuntimeEnvironment', () => {
  it('loads the public configuration from the same-origin endpoint', async () => {
    const fetchRuntimeEnvironment = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(RUNTIME_ENVIRONMENT), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(loadBrowserRuntimeEnvironment(fetchRuntimeEnvironment)).resolves.toEqual(
      RUNTIME_ENVIRONMENT,
    );
    expect(fetchRuntimeEnvironment).toHaveBeenCalledWith('/runtime-config.json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  });

  it('rejects an unavailable runtime endpoint instead of using another environment', async () => {
    const fetchRuntimeEnvironment = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(loadBrowserRuntimeEnvironment(fetchRuntimeEnvironment)).rejects.toThrow(
      /HTTP 503/,
    );
  });

  it('rejects an incomplete runtime payload', async () => {
    const fetchRuntimeEnvironment = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ...RUNTIME_ENVIRONMENT, apiUrl: '' }), { status: 200 }),
      );

    await expect(loadBrowserRuntimeEnvironment(fetchRuntimeEnvironment)).rejects.toThrow(
      /Invalid runtime environment payload/,
    );
  });
});
