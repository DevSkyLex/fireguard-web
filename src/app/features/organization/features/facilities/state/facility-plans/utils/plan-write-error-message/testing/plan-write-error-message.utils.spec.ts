import type { ApiError } from '@core/api/models';
import { toStoreError } from '@core/request-state';
import { planWriteErrorMessage } from '../plan-write-error-message.utils';

describe('planWriteErrorMessage', () => {
  it.each([
    ['equipment_decommissioned', 'Decommissioned'],
    ['attachment_not_floor_plan', 'Choose a floor plan'],
    ['resource_revision_conflict', 'coordinates have been kept'],
  ])('uses %s independently of server wording', (code, expected) => {
    const error: ApiError = {
      '@id': '',
      '@type': 'Error',
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Unrelated translated detail',
      code,
    };
    expect(planWriteErrorMessage(toStoreError(error), 'Fallback')).toContain(expected);
  });

  it('does not invent an assignment cause for an unknown conflict', () => {
    const error: ApiError = {
      '@id': '',
      '@type': 'Error',
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'A different conflict',
    };
    expect(planWriteErrorMessage(toStoreError(error), 'Fallback')).toBe('A different conflict');
  });
});
