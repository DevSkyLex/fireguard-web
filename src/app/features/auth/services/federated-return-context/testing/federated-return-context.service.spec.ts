import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FederatedReturnContextService } from '../federated-return-context.service';

describe('FederatedReturnContextService', () => {
  const invitation = '/organizations/invitations/accept?token=invitation-intent';
  const key = 'fireguard.auth.federated-return';
  let service: FederatedReturnContextService;
  let storage: Storage;

  beforeEach(() => {
    storage = window.sessionStorage;
    storage.removeItem(key);
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(FederatedReturnContextService);
  });

  afterEach(() => {
    storage.removeItem(key);
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('restores an invitation after a new runtime, consuming persistence only once', () => {
    service.remember('google', invitation);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(FederatedReturnContextService);

    expect(service.consume('google')).toBe(invitation);
    expect(service.consume('google')).toBe('');
    expect(storage.getItem(key)).toBeNull();
  });

  it('replaces the prior flow and refuses another provider', () => {
    service.remember('google', invitation);
    service.remember('microsoft', '/account/security');
    expect(service.consume('google')).toBe('');
    expect(service.consume('microsoft')).toBe('');
  });

  it('purges explicitly abandoned intent', () => {
    service.remember('google', invitation);
    service.clear();
    expect(service.consume('google')).toBe('');
  });

  it.each(['https://external.example', '//external.example', '/\\external.example'])(
    'refuses unsafe destination %s',
    (url) => {
      service.remember('google', url);
      expect(service.consume('google')).toBe('');
      expect(storage.getItem(key)).toBeNull();
    },
  );

  it('never reuses callback credentials as a destination', () => {
    expect(service.resolve('/auth/federated/google/callback?code=secret&state=secret')).toBe('');
    expect(
      service.resolve('/account/security/federated/google/callback?code=secret&state=secret'),
    ).toBe('/account/security');
    expect(service.resolve('/organizations?code=secret&state=secret&view=all')).toBe(
      '/organizations?view=all',
    );
  });

  it.each([-1, 30 * 60 * 1000 + 1])('purges a record outside its lifetime (%s ms)', (age) => {
    const now = 2_000_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    storage.setItem(
      key,
      JSON.stringify({ provider: 'google', returnUrl: invitation, createdAt: now - age }),
    );
    expect(service.consume('google')).toBe('');
    expect(storage.getItem(key)).toBeNull();
  });

  it.each([
    'not-json',
    'null',
    '{}',
    '{"provider":"google","returnUrl":"//external.example","createdAt":1}',
  ])('purges malformed context %s', (value) => {
    storage.setItem(key, value);
    expect(service.consume('google')).toBe('');
    expect(storage.getItem(key)).toBeNull();
  });

  it('does not access browser storage during SSR', () => {
    TestBed.resetTestingModule();
    const readStorage = vi.fn(() => {
      throw new Error('browser only');
    });
    const view = Object.defineProperty({}, 'sessionStorage', { get: readStorage });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: DOCUMENT, useValue: { defaultView: view } },
      ],
    });
    service = TestBed.inject(FederatedReturnContextService);
    service.remember('google', invitation);
    expect(service.consume('google')).toBe('');
    expect(readStorage).not.toHaveBeenCalled();
  });

  it('tolerates browsers that refuse session storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() => service.remember('google', invitation)).not.toThrow();
    expect(service.consume('google')).toBe('');
  });
});
