import { resolveComplianceBucket, COMPLIANCE_BUCKET_LEGEND } from '../facility-compliance-tag.util';

describe('resolveComplianceBucket', () => {
  it('resolves null to unmeasured, never to a failing bucket', () => {
    expect(resolveComplianceBucket(null).bucket).toBe('unmeasured');
  });

  it('resolves 90 and above to good', () => {
    expect(resolveComplianceBucket(90).bucket).toBe('good');
    expect(resolveComplianceBucket(100).bucket).toBe('good');
  });

  it('resolves 75 up to (but excluding) 90 to warning', () => {
    expect(resolveComplianceBucket(75).bucket).toBe('warning');
    expect(resolveComplianceBucket(89.9).bucket).toBe('warning');
  });

  it('resolves below 75 to critical', () => {
    expect(resolveComplianceBucket(74.9).bucket).toBe('critical');
    expect(resolveComplianceBucket(0).bucket).toBe('critical');
  });

  it('always pairs a color with a label, never color alone', () => {
    for (const rate of [null, 95, 80, 40]) {
      const descriptor = resolveComplianceBucket(rate);
      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.pinColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('COMPLIANCE_BUCKET_LEGEND', () => {
  it('lists exactly the three measured buckets, excluding unmeasured', () => {
    expect(COMPLIANCE_BUCKET_LEGEND.map((descriptor) => descriptor.bucket)).toEqual([
      'good',
      'warning',
      'critical',
    ]);
  });
});
