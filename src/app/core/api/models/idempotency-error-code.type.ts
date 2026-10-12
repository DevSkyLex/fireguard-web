/**
 * Type IdempotencyErrorCode
 *
 * @description
 * Published receipt failures. Retrying an unchanged intention must keep its original key; an
 * expired or unknown result never authorizes a new write identity.
 *
 * @type IdempotencyErrorCode
 */
export type IdempotencyErrorCode =
  | 'idempotency_key_required'
  | 'idempotency_key_invalid'
  | 'idempotency_conflict'
  | 'idempotency_in_progress'
  | 'idempotency_replay_expired'
  | 'idempotency_outcome_unknown'
  | 'idempotency_result_unavailable'
  | 'idempotency_owner_lost';
