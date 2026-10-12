import { HttpErrorResponse } from '@angular/common/http';
import { isIdempotencyOperationCompleted } from '../idempotency-error.utils';

describe('isIdempotencyOperationCompleted', () => {
  const completed = {
    status: 409,
    code: 'idempotency_replay_expired',
    operationCompleted: true,
  };

  it('recognizes a direct authoritative completed-operation tombstone', () => {
    expect(isIdempotencyOperationCompleted(completed)).toBe(true);
  });

  it('recognizes the tombstone in an HTTP wrapper with an authoritative transport status', () => {
    expect(
      isIdempotencyOperationCompleted(new HttpErrorResponse({ status: 409, error: completed })),
    ).toBe(true);
    expect(
      isIdempotencyOperationCompleted(
        new HttpErrorResponse({
          status: 409,
          error: { code: completed.code, operationCompleted: true },
        }),
      ),
    ).toBe(true);
  });

  it.each([undefined, null, false, 'true', 1, {}, []])(
    'requires the literal boolean flag instead of %j',
    (operationCompleted) => {
      const problem = { ...completed, operationCompleted };
      expect(isIdempotencyOperationCompleted(problem)).toBe(false);
      expect(
        isIdempotencyOperationCompleted(new HttpErrorResponse({ status: 409, error: problem })),
      ).toBe(false);
    },
  );

  it.each([
    'idempotency_conflict',
    'idempotency_in_progress',
    'idempotency_outcome_unknown',
    'idempotency_result_unavailable',
    'idempotency_owner_lost',
    'access_denied',
    undefined,
  ])('retains %s outcomes even when they carry a completion-like extension', (code) => {
    expect(isIdempotencyOperationCompleted({ ...completed, code })).toBe(false);
    expect(
      isIdempotencyOperationCompleted(
        new HttpErrorResponse({ status: 409, error: { ...completed, code } }),
      ),
    ).toBe(false);
  });

  it.each([0, 200, 400, 401, 403, 500, '409', undefined])(
    'requires exact numeric transport status instead of %j',
    (status) => {
      expect(isIdempotencyOperationCompleted({ ...completed, status })).toBe(false);
      expect(isIdempotencyOperationCompleted({ status, error: completed })).toBe(false);
    },
  );

  it('rejects contradictory outer and inner statuses or codes', () => {
    expect(
      isIdempotencyOperationCompleted(new HttpErrorResponse({ status: 403, error: completed })),
    ).toBe(false);
    expect(
      isIdempotencyOperationCompleted(
        new HttpErrorResponse({ status: 409, error: { ...completed, status: 403 } }),
      ),
    ).toBe(false);
    expect(
      isIdempotencyOperationCompleted({ status: 409, code: 'access_denied', error: completed }),
    ).toBe(false);
  });

  it.each([null, undefined, false, 'completed', {}, { status: 409, error: 'completed' }])(
    'rejects malformed problem %j',
    (problem) => expect(isIdempotencyOperationCompleted(problem)).toBe(false),
  );
});
