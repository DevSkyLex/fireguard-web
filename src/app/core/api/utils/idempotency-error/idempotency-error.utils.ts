import type { IdempotencyErrorCode } from '../../models/idempotency-error-code.type';

/**
 * Function getIdempotencyErrorCode
 *
 * @description
 * Reads the stable receipt code from a direct API problem or an Angular HTTP error wrapper.
 *
 * @access public
 * @since unreleased
 *
 * @param {unknown} error - Direct or wrapped server error.
 *
 * @returns {IdempotencyErrorCode | null} A recognized receipt failure, otherwise null.
 */
export function getIdempotencyErrorCode(error: unknown): IdempotencyErrorCode | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = 'code' in error ? error.code : null;
  switch (code) {
    case 'idempotency_key_required':
    case 'idempotency_key_invalid':
    case 'idempotency_conflict':
    case 'idempotency_in_progress':
    case 'idempotency_replay_expired':
    case 'idempotency_outcome_unknown':
    case 'idempotency_result_unavailable':
    case 'idempotency_owner_lost':
      return code;
    default:
      return 'error' in error ? getIdempotencyErrorCode(error.error) : null;
  }
}

/**
 * Function isIdempotencyOperationCompleted
 *
 * @description
 * Recognizes the server's authoritative completed-operation tombstone after a replay payload
 * has expired. Other conflicts and uncertain outcomes retain their original operation identity.
 *
 * @access public
 * @since unreleased
 *
 * @param {unknown} error - Direct Hydra problem or Angular HTTP error wrapper.
 *
 * @returns {boolean} Whether exact HTTP 409 replay expiry explicitly confirms completion.
 */
export function isIdempotencyOperationCompleted(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error) {
    return (
      'status' in error &&
      error.status === 409 &&
      error.code === 'idempotency_replay_expired' &&
      'operationCompleted' in error &&
      error.operationCompleted === true
    );
  }
  if (!('status' in error) || error.status !== 409 || !('error' in error)) return false;
  const problem = error.error;
  return (
    typeof problem === 'object' &&
    problem !== null &&
    (!('status' in problem) || problem.status === 409) &&
    'code' in problem &&
    problem.code === 'idempotency_replay_expired' &&
    'operationCompleted' in problem &&
    problem.operationCompleted === true
  );
}
