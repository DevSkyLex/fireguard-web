import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { trustedApiUrl } from '../../utils/trusted-api-url/trusted-api-url.utils';

/**
 * Function idempotencyInterceptor
 *
 * @description
 * Requires a preallocated identity on trusted API writes. Generating keys here would change a
 * cold observable's identity on every subscription, so missing keys fail before network I/O.
 * The onboarding synchronization GET also requires an identity. Other read requests and
 * unrelated URLs pass through unchanged.
 *
 * @access public
 * @since unreleased
 *
 * @param req - The immutable outgoing request.
 * @param next - The remaining interceptor chain.
 *
 * @returns An observable of the original request or the typed missing-key failure.
 */
export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  const target = trustedApiUrl(req.url, inject(ENV_CONFIG).apiUrl);
  if (target === null) return next(req);
  const synchronizesOnboarding =
    req.method === 'GET' && target.pathname === '/api/onboarding/organization';
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !synchronizesOnboarding)
    return next(req);
  if (req.headers.has('Idempotency-Key')) return next(req);

  return throwError(
    () =>
      new HttpErrorResponse({
        status: 400,
        error: {
          type: '/problems/idempotency-key-required',
          title: 'Missing operation identity',
          detail: 'Create a write operation before submitting this request.',
          status: 400,
          code: 'idempotency_key_required',
        },
      }),
  );
};
