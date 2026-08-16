import { resolveComplianceBucket } from '../compliance-status-bucket.utils';

describe('resolveComplianceBucket', () => {
  it('grades null as unknown', () => {
    expect(resolveComplianceBucket(null)).toBe('unknown');
  });

  it('grades a rate at the ok threshold as ok', () => {
    expect(resolveComplianceBucket(90)).toBe('ok');
  });

  it('grades a rate above the ok threshold as ok', () => {
    expect(resolveComplianceBucket(100)).toBe('ok');
  });

  it('grades a rate just below the ok threshold as attention', () => {
    expect(resolveComplianceBucket(89.9)).toBe('attention');
  });

  it('grades a rate at the attention threshold as attention', () => {
    expect(resolveComplianceBucket(60)).toBe('attention');
  });

  it('grades a rate below the attention threshold as critical', () => {
    expect(resolveComplianceBucket(59.9)).toBe('critical');
  });

  it('grades a rate of zero as critical', () => {
    expect(resolveComplianceBucket(0)).toBe('critical');
  });
});
