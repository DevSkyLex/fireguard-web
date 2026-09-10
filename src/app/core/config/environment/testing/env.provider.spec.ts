import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideEnv } from '../env.provider';
import { ENV_CONFIG } from '../env.token';
import type { EnvironmentConfig } from '../environment-config.interface';
import { RUNTIME_ENV_CONFIG } from '../runtime-env.token';

/** A production config whose origins are all HTTPS, used as the mutation base. */
const SECURE_PRODUCTION: EnvironmentConfig = {
  production: true,
  apiUrl: 'https://api.fireguard.valentin-fortin.pro',
  appName: 'Fireguard',
  mercureHubUrl: 'https://mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
  maintenance: false,
};

describe('provideEnv', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

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

  it('uses the server runtime configuration and writes the hydration handoff', () => {
    const runtime: EnvironmentConfig = {
      ...SECURE_PRODUCTION,
      apiUrl: 'https://dev.api.fireguard.valentin-fortin.pro',
      mercureHubUrl: 'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
    };

    TestBed.configureTestingModule({
      providers: [
        provideEnv(SECURE_PRODUCTION),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: RUNTIME_ENV_CONFIG, useValue: runtime },
      ],
    });

    expect(TestBed.inject(ENV_CONFIG)).toEqual(runtime);
    expect(
      TestBed.inject(TransferState).get(
        makeStateKey<EnvironmentConfig>('fireguard-runtime-environment'),
        SECURE_PRODUCTION,
      ),
    ).toEqual(runtime);
  });

  it('hydrates with the transferred runtime configuration and consumes it once', () => {
    const transferred: EnvironmentConfig = {
      ...SECURE_PRODUCTION,
      appName: 'Fireguard Dev',
    };

    TestBed.configureTestingModule({
      providers: [provideEnv(SECURE_PRODUCTION), { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const transferState = TestBed.inject(TransferState);
    const key = makeStateKey<EnvironmentConfig>('fireguard-runtime-environment');
    transferState.set(key, transferred);

    expect(TestBed.inject(ENV_CONFIG)).toEqual(transferred);
    expect(transferState.hasKey(key)).toBe(false);
  });

  it('uses the browser runtime configuration when a cached shell has no hydration state', () => {
    const runtime: EnvironmentConfig = {
      ...SECURE_PRODUCTION,
      apiUrl: 'https://dev.api.fireguard.valentin-fortin.pro',
      mercureHubUrl: 'https://dev.mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
    };

    TestBed.configureTestingModule({
      providers: [
        provideEnv(SECURE_PRODUCTION),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: RUNTIME_ENV_CONFIG, useValue: runtime },
      ],
    });

    expect(TestBed.inject(ENV_CONFIG)).toEqual(runtime);
  });
});
