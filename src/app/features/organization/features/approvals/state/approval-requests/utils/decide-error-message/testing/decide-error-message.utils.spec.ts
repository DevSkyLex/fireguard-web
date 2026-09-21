import type { ApiError } from '@core/api/models';
import type { StoreError } from '@core/request-state';
import { decideErrorMessage } from '../decide-error-message.utils';

describe('decideErrorMessage', () => {
  const baseError: ApiError = {
    '@id': '',
    '@type': 'Error',
    status: 0,
    type: 'about:blank',
    title: '',
    detail: '',
  };

  function storeError(
    code: number | null,
    detail: string,
    message: string | null = null,
    applicationCode?: string,
  ): StoreError {
    return {
      error: { ...baseError, status: code ?? 0, detail, code: applicationCode },
      message,
      code,
      retryable: false,
      timestamp: Date.now(),
    };
  }

  it('maps the subject-changed code independently of the detail language', () => {
    expect(
      decideErrorMessage(
        storeError(409, 'La ressource a changé.', null, 'approval_subject_changed'),
      ),
    ).toContain('cancelled');
  });

  it('maps the no-longer-pending code', () => {
    expect(decideErrorMessage(storeError(409, '', null, 'approval_not_pending'))).toContain(
      'already decided',
    );
  });

  it('should map a 403 with a self-approval detail to the self-approval copy', () => {
    expect(
      decideErrorMessage(storeError(403, '', null, 'approval_self_decision_forbidden')),
    ).toContain('yourself');
  });

  it('should map any other 403 to the below-minimum-role copy', () => {
    expect(decideErrorMessage(storeError(403, '', null, 'approval_role_required'))).toContain(
      'approver',
    );
  });

  it('should fall back to the normalized message for any other status', () => {
    expect(decideErrorMessage(storeError(500, '', 'Server exploded'))).toBe('Server exploded');
  });

  it('should fall back to the generic copy when there is no normalized message', () => {
    expect(decideErrorMessage(storeError(null, ''))).toContain('could not be recorded');
  });
});
