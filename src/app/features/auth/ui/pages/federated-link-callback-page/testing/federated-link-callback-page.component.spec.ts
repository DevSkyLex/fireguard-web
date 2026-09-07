import { Location } from '@angular/common';
import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { errorCallState } from '@core/request-state';
import { FederatedAuthStore } from '@features/auth/state';
import { FederatedLinkCallbackPage } from '../federated-link-callback-page.component';

describe('FederatedLinkCallbackPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should leave the one-time connection callback untouched during SSR', () => {
    const completeLink = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'microsoft' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/account/security/federated/microsoft/callback?code=one-time-code&state=opaque-state',
            navigate: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLink,
            completeLinkCallState: signal({ status: 'idle' }),
            resetCompleteLink: vi.fn(),
          },
        },
      ],
    });
    TestBed.overrideComponent(FederatedLinkCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedLinkCallbackPage).detectChanges();

    expect(completeLink).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('should consume the connection callback once in the browser after cleaning the URL', () => {
    const completeLink = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'microsoft' }),
              queryParamMap: convertToParamMap({ code: 'one-time-code', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/account/security/federated/microsoft/callback?code=one-time-code&state=opaque-state',
            navigate: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLink,
            completeLinkCallState: signal({ status: 'idle' }),
            resetCompleteLink: vi.fn(),
          },
        },
      ],
    });
    TestBed.overrideComponent(FederatedLinkCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedLinkCallbackPage).detectChanges();

    expect(replaceState).toHaveBeenCalledWith('/account/security/federated/microsoft/callback');
    expect(completeLink).toHaveBeenCalledOnce();
    expect(completeLink).toHaveBeenCalledWith({
      provider: 'microsoft',
      input: { code: 'one-time-code', state: 'opaque-state' },
    });
  });

  it('should submit a provider cancellation so the backend consumes the linking flow', () => {
    const completeLink = vi.fn();
    const replaceState = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Location, useValue: { replaceState } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'microsoft' }),
              queryParamMap: convertToParamMap({ error: 'access_denied', state: 'opaque-state' }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/account/security/federated/microsoft/callback?error=access_denied&state=opaque-state',
            navigate: vi.fn(),
          },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLink,
            completeLinkCallState: signal({ status: 'idle' }),
            resetCompleteLink: vi.fn(),
          },
        },
      ],
    });
    TestBed.overrideComponent(FederatedLinkCallbackPage, { set: { template: '' } });

    TestBed.createComponent(FederatedLinkCallbackPage).detectChanges();

    expect(replaceState).toHaveBeenCalledWith('/account/security/federated/microsoft/callback');
    expect(completeLink).toHaveBeenCalledWith({
      provider: 'microsoft',
      input: { error: 'access_denied', state: 'opaque-state' },
    });
  });

  it('should render the link completion error instead of keeping the spinner visible', async () => {
    const error = {
      error: null,
      message: 'identity_linked',
      code: 409,
      retryable: false,
      timestamp: 0,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Location, useValue: { replaceState: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ provider: 'microsoft' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: Router,
          useValue: { url: '/account/security/federated/microsoft/callback', navigate: vi.fn() },
        },
        {
          provide: FederatedAuthStore,
          useValue: {
            completeLink: vi.fn(),
            completeLinkCallState: signal(errorCallState(error)),
            completeLinkError: signal(error),
            resetCompleteLink: vi.fn(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FederatedLinkCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'This provider account is already connected to another Fireguard account.',
    );
    expect(fixture.nativeElement.querySelector('hlm-spinner')).toBeNull();
  });
});
