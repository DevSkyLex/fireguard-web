import { readServerRuntimeEnvironment } from '../runtime-env.server';

const RUNTIME_KEYS = [
  'FIREGUARD_RUNTIME_CONFIG',
  'APP_API_URL',
  'APP_NAME',
  'APP_MERCURE_HUB_URL',
  'APP_MAINTENANCE',
] as const;

describe('readServerRuntimeEnvironment', () => {
  const originalValues = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of RUNTIME_KEYS) originalValues.set(key, process.env[key]);
  });

  afterEach(() => {
    for (const key of RUNTIME_KEYS) {
      const value = originalValues.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    originalValues.clear();
  });

  it('keeps local commands on the bundled environment by default', () => {
    delete process.env['FIREGUARD_RUNTIME_CONFIG'];

    expect(readServerRuntimeEnvironment()).toBeNull();
  });

  it('reads the complete public runtime contract for a hosted SSR process', () => {
    process.env['FIREGUARD_RUNTIME_CONFIG'] = 'true';
    process.env['APP_API_URL'] = 'https://dev.api.fireguard.valentin-fortin.pro';
    process.env['APP_NAME'] = 'Fireguard';
    process.env['APP_MERCURE_HUB_URL'] =
      'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure';
    process.env['APP_MAINTENANCE'] = 'false';

    expect(readServerRuntimeEnvironment()).toEqual({
      production: true,
      apiUrl: 'https://dev.api.fireguard.valentin-fortin.pro',
      appName: 'Fireguard',
      mercureHubUrl: 'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
      maintenance: false,
    });
  });

  it('rejects an incomplete hosted runtime contract', () => {
    process.env['FIREGUARD_RUNTIME_CONFIG'] = 'true';
    delete process.env['APP_API_URL'];

    expect(() => readServerRuntimeEnvironment()).toThrow(/APP_API_URL/);
  });

  it('rejects ambiguous maintenance values', () => {
    process.env['FIREGUARD_RUNTIME_CONFIG'] = 'true';
    process.env['APP_API_URL'] = 'https://dev.api.fireguard.valentin-fortin.pro';
    process.env['APP_NAME'] = 'Fireguard';
    process.env['APP_MERCURE_HUB_URL'] =
      'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure';
    process.env['APP_MAINTENANCE'] = 'no';

    expect(() => readServerRuntimeEnvironment()).toThrow(/APP_MAINTENANCE/);
  });
});
