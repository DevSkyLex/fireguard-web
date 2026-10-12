import { HttpErrorResponse } from '@angular/common/http';
import { toStoreError } from '../store-error.utils';

describe('toStoreError', () => {
  it.each([
    'idempotency_key_required',
    'idempotency_key_invalid',
    'idempotency_conflict',
    'idempotency_replay_expired',
    'idempotency_outcome_unknown',
    'idempotency_result_unavailable',
    'idempotency_owner_lost',
  ])('retains %s as a typed failure that cannot trigger a blind new write', (code) => {
    const error = {
      type: '/problems/idempotency',
      status: 409,
      title: 'Receipt requires review',
      detail: 'Keep the original operation.',
      code,
    };
    expect(toStoreError(error)).toMatchObject({ code, retryable: false });
    expect(toStoreError(new HttpErrorResponse({ status: 409, error }))).toMatchObject({
      code,
      retryable: false,
    });
  });

  it('allows an in-progress receipt to be retried with the original identity', () => {
    expect(
      toStoreError({
        type: '/problems/idempotency',
        status: 409,
        title: 'In progress',
        detail: 'Retry the original operation later.',
        code: 'idempotency_in_progress',
      }),
    ).toMatchObject({ code: 'idempotency_in_progress', retryable: true });
  });
});
