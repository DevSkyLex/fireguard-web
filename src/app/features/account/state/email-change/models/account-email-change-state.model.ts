import type { CallState } from '@core/request-state';
import type { RequestEmailChangeOutput } from '@features/account/models';

/**
 * Interface AccountEmailChangeState
 * @interface AccountEmailChangeState
 *
 * @description
 * State of the sign-in email change workflow. The backend exposes no read
 * endpoint for a pending request, so `pendingEmail` is the only record the
 * UI has of one — it lives exactly as long as the owning page does, and a
 * reload forgets it (documented in `FEATURE.md`). Requesting again is safe:
 * the backend replaces any pending request.
 *
 * @since 1.0.0
 */
export interface AccountEmailChangeState {
  /** The address a confirmation link was sent to, or `null` when none was requested here. */
  readonly pendingEmail: string | null;

  /** Expiration timestamp of the confirmation token, when the backend provided one. */
  readonly expiresAt: string | null;

  /** Call state of the request (and re-request) step. */
  readonly requestCallState: CallState<RequestEmailChangeOutput | null>;

  /** Call state of the cancellation. */
  readonly cancelCallState: CallState;
}
