import type { CallState } from '@core/request-state';
import type { ConfirmEmailChangeOutput } from '@features/auth/models';

/**
 * Interface EmailChangeConfirmState
 * @interface EmailChangeConfirmState
 *
 * @description
 * State of the public email change confirmation — a single call, keyed by
 * the emailed token.
 *
 * @since 1.0.0
 */
export interface EmailChangeConfirmState {
  /** Call state of the confirmation. */
  readonly confirmCallState: CallState<ConfirmEmailChangeOutput | null>;
}
