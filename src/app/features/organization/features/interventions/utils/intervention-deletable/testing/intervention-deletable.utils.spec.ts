import type { InterventionStatus } from '@features/organization/features/interventions/models';
import { isInterventionDeletable } from '../intervention-deletable.utils';

describe('isInterventionDeletable', () => {
  it.each<InterventionStatus>(['draft', 'abandoned'])(
    'should accept a %s intervention',
    (status: InterventionStatus): void => {
      expect(isInterventionDeletable({ status })).toBe(true);
    },
  );

  it.each<InterventionStatus>([
    'planned',
    'in_progress',
    'submitted',
    'changes_requested',
    'published',
  ])('should refuse a %s intervention', (status: InterventionStatus): void => {
    expect(isInterventionDeletable({ status })).toBe(false);
  });
});
