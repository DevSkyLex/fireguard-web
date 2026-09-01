import {
  type HttpInterceptorFn,
  type HttpRequest,
  type HttpHandlerFn,
  type HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';

/**
 * Endpoints excluded from 401 handling.
 *
 * These all answer 401 to mean *"the value you supplied is wrong"* — bad
 * credentials, a mistyped one-time code, an expired reset token — not *"your
 * session is gone"*. Treating them as a dead session logs the user out mid-flow:
 * on `/api/me/password/confirm` the caller is fully authenticated, so a typo in
 * the OTP used to end their session outright.
 *
 * The API reuses 401 for both meanings, so the distinction has to be made here by
 * path. The durable fix is server-side — a rejected *value* belongs in 422 — and
 * this list should shrink as endpoints are corrected.
 */
const EXCLUDED_ENDPOINTS: RegExp[] = [
  /\/api\/auth\/login$/,
  /\/api\/auth\/logout$/,
  /\/api\/auth\/refresh$/,
  /\/api\/auth\/register$/,
  // Pre-authentication MFA challenge: there is no session to lose yet.
  /\/api\/auth\/mfa\/(verify|resend)$/,
  // Password reset: the caller is anonymous and holds a token, not a session.
  /\/api\/auth\/password\/reset(\/.*)?$/,
  // Authenticated password change: 401 means the current password or the emailed
  // code was wrong. Signing the user out is the one thing that must not happen.
  /\/api\/me\/password\/(request|confirm)$/,
];

/**
 * Unauthorized Interceptor
 *
 * @description
 * Handles 401 Unauthorized responses from the API.
 *
 * An access token expiring is not a reason to sign someone out: the
 * `refresh_token` cookie usually outlives it by a wide margin. So a 401 first
 * triggers one session renewal and replays the request; only when that renewal
 * fails is the session cleared and the user sent to the login page.
 *
 * The renewal itself is shared by the session port, so a page firing several
 * requests at once refreshes once rather than racing a rotating token.
 *
 * The replay is safe for non-idempotent methods too: it only ever fires for a
 * request the server refused with 401 — one it never processed — and runs at
 * most once, so a POST replayed here cannot duplicate a side effect.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);
  const router: Router = inject<Router>(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isExcluded: boolean = EXCLUDED_ENDPOINTS.some((pattern: RegExp) =>
        pattern.test(req.url),
      );

      // A 403 is intentionally not handled here: it does not block the page,
      // so it propagates to the caller's error handling (CallState / toast)
      // instead of triggering a full-page redirect.
      if (error.status !== 401 || isExcluded) {
        return throwError(() => error);
      }

      const endSession = (): Observable<never> => {
        authSession.clearSession();
        router.navigate(['/auth/login']);

        return throwError(() => error);
      };

      return authSession.renewSession().pipe(
        switchMap((token: string | null) => {
          if (token === null) return endSession();

          // This interceptor sits *after* the one that attaches the bearer, so a
          // replay through `next()` never passes it again — the fresh token has
          // to be set here or the retry would repeat the expired one.
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
            // The replay runs inside this handler, so its own failure never comes
            // back around to the `catchError` above. Refusing a request that
            // carries a *fresh* token means the session is genuinely gone —
            // a revoked account, a disabled user — so stop here rather than renew
            // again, which is what would turn this into an endless loop.
            catchError((retryError: HttpErrorResponse) =>
              retryError.status === 401 ? endSession() : throwError(() => retryError),
            ),
          );
        }),
      );
    }),
  );
};
