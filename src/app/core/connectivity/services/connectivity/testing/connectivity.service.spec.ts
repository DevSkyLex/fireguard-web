import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '../connectivity.service';

/**
 * The status-0 ApiError that `HydraApiService.handleError` produces from a
 * transport failure — a plain object, NOT an `HttpErrorResponse`. This is what
 * a feature service actually emits when "online but unreachable" (captive
 * portal, dead server), and what `isNetworkFailure` must still recognize.
 */
const NORMALIZED_NETWORK_ERROR = {
  '@id': '',
  '@type': 'Error',
  status: 0,
  type: 'about:blank',
  title: 'Network Error',
  detail: 'Http failure response for /api: 0 Unknown Error',
} as const;

function setOnline(value: boolean): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    TestBed.configureTestingModule({ providers: [ConnectivityService] });
    service = TestBed.inject(ConnectivityService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('treats any error as a network failure while offline', () => {
    setOnline(false);

    expect(service.isOffline()).toBe(true);
    expect(service.isNetworkFailure({ '@type': 'Error', status: 422, detail: 'x' })).toBe(true);
  });

  it('detects a status-0 HttpErrorResponse while online', () => {
    expect(service.isNetworkFailure(new HttpErrorResponse({ status: 0 }))).toBe(true);
  });

  it('detects a status-0 ApiError normalized by HydraApiService while online', () => {
    // The "online but unreachable" regression guard: the error reaching a store
    // is the normalized ApiError, not the raw HttpErrorResponse.
    expect(service.isNetworkFailure(NORMALIZED_NETWORK_ERROR)).toBe(true);
  });

  it('does not treat a server or business error as a network failure while online', () => {
    expect(service.isNetworkFailure(new HttpErrorResponse({ status: 503 }))).toBe(false);
    expect(service.isNetworkFailure({ '@type': 'Error', status: 500, detail: 'boom' })).toBe(false);
    expect(service.isNetworkFailure(new Error('not a network error'))).toBe(false);
  });
});
