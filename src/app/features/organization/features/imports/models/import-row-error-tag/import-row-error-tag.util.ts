import type { ImportRowErrorCode } from '../import-job/import-row-error-code.type';
import type { ImportRowErrorTagDescriptor } from './import-row-error-tag-descriptor.interface';

/**
 * Descriptors for every `ImportRowErrorCode` value. `would_create` is the
 * one positive code — a dry run reports it for every row that validated —
 * so it alone renders `success`, never the danger or warning tint the
 * others (genuine row problems, or member rows skipped as duplicates)
 * carry.
 */
const IMPORT_ROW_ERROR_CODE: Record<ImportRowErrorCode, ImportRowErrorTagDescriptor> = {
  would_create: {
    label: $localize`:@@imports.rowErrorCode.wouldCreate:Would create`,
    severity: 'success',
    icon: 'lucideCirclePlus',
  },
  invalid: {
    label: $localize`:@@imports.rowErrorCode.invalid:Invalid value`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
  missing_required: {
    label: $localize`:@@imports.rowErrorCode.missingRequired:Missing required value`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
  quota_exceeded: {
    label: $localize`:@@imports.rowErrorCode.quotaExceeded:Plan limit reached`,
    severity: 'warning',
    icon: 'lucideTriangleAlert',
  },
  already_member: {
    label: $localize`:@@imports.rowErrorCode.alreadyMember:Already a member`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  already_invited: {
    label: $localize`:@@imports.rowErrorCode.alreadyInvited:Already invited`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  unknown_role: {
    label: $localize`:@@imports.rowErrorCode.unknownRole:Unknown role`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
};

/**
 * Function resolveImportRowErrorTag
 *
 * @description
 * Resolves the presentation descriptor for an `ImportRowErrorCode` value.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * report still renders a readable label.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw row error code.
 *
 * @returns {ImportRowErrorTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveImportRowErrorTag(value: string): ImportRowErrorTagDescriptor {
  return (
    IMPORT_ROW_ERROR_CODE[value as ImportRowErrorCode] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
