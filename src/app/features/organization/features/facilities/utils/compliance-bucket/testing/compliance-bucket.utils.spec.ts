import { resolveComplianceBucket } from '../compliance-bucket.utils';

describe('resolveComplianceBucket', () => {
  it('buckets a rate of 90 or above as positive', () => {
    expect(resolveComplianceBucket(90)).toBe('positive');
    expect(resolveComplianceBucket(100)).toBe('positive');
  });

  it('buckets a rate between 60 and 89 as warning', () => {
    expect(resolveComplianceBucket(60)).toBe('warning');
    expect(resolveComplianceBucket(89)).toBe('warning');
  });

  it('buckets a rate below 60 as critical', () => {
    expect(resolveComplianceBucket(59)).toBe('critical');
    expect(resolveComplianceBucket(0)).toBe('critical');
  });

  it('buckets no data as muted', () => {
    expect(resolveComplianceBucket(null)).toBe('muted');
  });
});
