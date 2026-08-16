import type { ComplianceBucket } from '../compliance/compliance-bucket.type';
import type { ComplianceBucketTagDescriptor } from './compliance-bucket-tag-descriptor.interface';

/** Descriptors for every `ComplianceBucket` value, in ascending severity. */
const BUCKET: Record<ComplianceBucket, ComplianceBucketTagDescriptor> = {
  ok: {
    label: $localize`:@@complianceBucket.ok:Compliant`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  attention: {
    label: $localize`:@@complianceBucket.attention:Needs attention`,
    severity: 'warning',
    icon: 'lucideTriangleAlert',
  },
  critical: {
    label: $localize`:@@complianceBucket.critical:Critical`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
  unknown: {
    label: $localize`:@@complianceBucket.unknown:No tracked equipment`,
    severity: 'neutral',
    icon: 'lucideCircleHelp',
  },
};

/**
 * Function resolveComplianceBucketTag
 *
 * @description
 * Resolves the presentation descriptor for a compliance severity bucket.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ComplianceBucket} bucket - The bucket to resolve.
 *
 * @returns {ComplianceBucketTagDescriptor} The matching descriptor.
 */
export function resolveComplianceBucketTag(
  bucket: ComplianceBucket,
): ComplianceBucketTagDescriptor {
  return BUCKET[bucket];
}
