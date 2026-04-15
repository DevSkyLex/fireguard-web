import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CookieService } from '../cookie.service';

describe('CookieService', () => {
  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

  afterEach(() => {
    TestBed.resetTestingModule();

    if (originalCookieDescriptor) {
      Object.defineProperty(Document.prototype, 'cookie', originalCookieDescriptor);
    }
  });

  it('should serialize browser cookies with max-age, expires, and sameSite', () => {
    const writes: string[] = [];

    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get: () => writes.join('; '),
      set: (value: string) => {
        writes.push(value);
      },
    });

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });

    const service = TestBed.inject(CookieService);
    const expiryDate = new Date('2030-01-01T00:00:00.000Z');

    service.setCookie({
      name: 'theme-preference',
      value: 'dark',
      maxAge: 60,
      expires: expiryDate,
      path: '/',
      sameSite: 'Lax',
      secure: true,
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('theme-preference=dark;');
    expect(writes[0]).toContain('max-age=60;');
    expect(writes[0]).toContain(`expires=${expiryDate.toUTCString()};`);
    expect(writes[0]).toContain('path=/;');
    expect(writes[0]).toContain('secure;');
    expect(writes[0]).toContain('samesite=Lax;');
  });

  it('should read cookies from the SSR request header', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('http://localhost', {
            headers: { cookie: 'theme-preference=dark; refresh_token=abc123' },
          }),
        },
      ],
    });

    const service = TestBed.inject(CookieService);

    expect(service.getCookie<string>('refresh_token')).toBe('abc123');
    expect(service.getCookie<string>('theme-preference')).toBe('dark');
  });

  it('should ignore setCookie in SSR context', () => {
    const writes: string[] = [];

    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true,
      get: () => writes.join('; '),
      set: (value: string) => {
        writes.push(value);
      },
    });

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const service = TestBed.inject(CookieService);

    service.setCookie({
      name: 'theme-preference',
      value: 'dark',
      maxAge: 60,
    });

    expect(writes).toHaveLength(0);
  });
});
