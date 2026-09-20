import { workloadAssessmentFromError } from '../workload-assessment-error.utils';

describe('workloadAssessmentFromError', () => {
  const increase = {
    memberId: 'member',
    memberName: 'Alex',
    date: '2026-09-16',
    reason: 'daily_overload',
    beforeMinutes: 0,
    afterMinutes: 60,
    capacityMinutes: 420,
  };
  const assessment = {
    confirmationRequired: true,
    confirmationToken: 'opaque-token',
    completeness: 'partial',
    increases: [increase],
  };
  it('retains the exact presented assessment and token', () => {
    expect(workloadAssessmentFromError({ assessment })).toBe(assessment);
  });
  it.each([null, {}, { assessment: {} }, { assessment: { ...assessment, confirmationToken: '' } }])(
    'does not expose confirmation for a malformed conflict %j',
    (value) => {
      expect(workloadAssessmentFromError(value)).toBeNull();
    },
  );
  it.each([
    { memberName: 42 },
    { beforeMinutes: -1 },
    { afterMinutes: NaN },
    { capacityMinutes: Infinity },
    { afterMinutes: 0 },
  ])('rejects unsafe daily impact %j', (patch) => {
    expect(
      workloadAssessmentFromError({
        assessment: { ...assessment, increases: [{ ...increase, ...patch }] },
      }),
    ).toBeNull();
  });
});
