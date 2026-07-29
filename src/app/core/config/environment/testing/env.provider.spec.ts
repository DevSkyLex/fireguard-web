import { provideEnv } from '../env.provider';
import type { EnvironmentConfig } from '../environment-config.interface';

/** A production config whose origins are all HTTPS, used as the mutation base. */
const SECURE_PRODUCTION: EnvironmentConfig = {
  production: true,
  apiUrl: 'https://api.fireguard.valentin-fortin.pro',
  appName: 'Fireguard',
  mercureHubUrl: 'https://mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
  maintenance: false,
};

describe('provideEnv', () => {
  it('accepts a production config whose origins are all HTTPS', () => {
    expect(() => provideEnv(SECURE_PRODUCTION)).not.toThrow();
  });

  it.each([
    ['apiUrl', 'http://localhost:8000'],
    ['mercureHubUrl', 'http://localhost:3000/.well-known/mercure'],
  ] as const)('throws when a production build targets a plaintext %s', (key, insecureValue) => {
    const config: EnvironmentConfig = { ...SECURE_PRODUCTION, [key]: insecureValue };

    expect(() => provideEnv(config)).toThrow(/Insecure production environment/);
  });

  it('names every offending origin so the misconfiguration is actionable', () => {
    const config: EnvironmentConfig = {
      ...SECURE_PRODUCTION,
      apiUrl: 'http://localhost:8000',
      mercureHubUrl: 'http://localhost:3000/.well-known/mercure',
    };

    expect(() => provideEnv(config)).toThrow(/apiUrl=.*mercureHubUrl=/);
  });

  it('leaves non-production builds free to target localhost', () => {
    const development: EnvironmentConfig = {
      ...SECURE_PRODUCTION,
      production: false,
      apiUrl: 'http://localhost:8000',
      mercureHubUrl: 'http://localhost:3000/.well-known/mercure',
    };

    expect(() => provideEnv(development)).not.toThrow();
  });
});
