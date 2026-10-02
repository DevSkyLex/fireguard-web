import type { ComplianceStatus } from '@features/organization/models';
import { resolveComplianceStatusTag } from '../compliance-status-tag.util';

describe('resolveComplianceStatusTag', () => {
  it('resolves a descriptor for every backend-emitted status', () => {
    const statuses: readonly ComplianceStatus[] = [
      'compliant',
      'at_risk',
      'non_compliant',
      'not_applicable',
    ];

    for (const status of statuses) {
      const descriptor = resolveComplianceStatusTag(status);

      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.icon.length).toBeGreaterThan(0);
    }
  });

  it('carries success severity for a compliant status', () => {
    expect(resolveComplianceStatusTag('compliant').severity).toBe('success');
    expect(resolveComplianceStatusTag('compliant').label).toBe('Up to date');
  });

  it('carries warning severity for an at-risk status', () => {
    expect(resolveComplianceStatusTag('at_risk').severity).toBe('warning');
  });

  it('carries danger severity for a non-compliant status', () => {
    expect(resolveComplianceStatusTag('non_compliant').severity).toBe('danger');
  });

  it('carries neutral severity for a not-applicable status', () => {
    expect(resolveComplianceStatusTag('not_applicable').severity).toBe('neutral');
  });
});
