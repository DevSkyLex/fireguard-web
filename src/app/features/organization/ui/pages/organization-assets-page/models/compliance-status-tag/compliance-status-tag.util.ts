import type {
  ComplianceBucketTagDescriptor,
  ComplianceStatus,
} from '@features/organization/models';

/**
 * Constant STATUS
 *
 * @description
 * Descriptors for every `ComplianceStatus` value the backend can grade a
 * scope with, reusing the compliance badge's existing presentation triple —
 * a localized label, a badge severity, and an icon — so the graded verdict
 * renders through the same anatomy as the rate-bucket badge it sits beside.
 *
 * @since 1.0.0
 */
const STATUS: Readonly<Record<ComplianceStatus, ComplianceBucketTagDescriptor>> = {
  compliant: {
    label: $localize`:@@org.assets.compliance.status.compliant:Up to date`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  at_risk: {
    label: $localize`:@@org.assets.compliance.status.atRisk:At risk`,
    severity: 'warning',
    icon: 'lucideTriangleAlert',
  },
  non_compliant: {
    label: $localize`:@@org.assets.compliance.status.nonCompliant:Non-compliant`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
  not_applicable: {
    label: $localize`:@@org.assets.compliance.status.notApplicable:Not applicable`,
    severity: 'neutral',
    icon: 'lucideCircleHelp',
  },
};

/**
 * Function resolveComplianceStatusTag
 *
 * @description
 * Resolves the presentation descriptor for the backend's graded
 * `organizationStatus` verdict — distinct from the rate-derived
 * `ComplianceBucket` badge, which stays computed from `complianceRate`
 * alone.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ComplianceStatus} status - The graded compliance verdict to resolve.
 *
 * @returns {ComplianceBucketTagDescriptor} The matching descriptor.
 */
export function resolveComplianceStatusTag(
  status: ComplianceStatus,
): ComplianceBucketTagDescriptor {
  return STATUS[status];
}
