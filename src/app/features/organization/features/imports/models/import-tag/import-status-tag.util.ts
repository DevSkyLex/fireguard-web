import type { ImportJobStatus } from '../import-job/import-job-status.type';
import type { ImportStatusTagDescriptor } from './import-status-tag-descriptor.interface';

/**
 * Status descriptors for every `ImportJobStatus` value.
 */
const IMPORT_STATUS: Record<ImportJobStatus, ImportStatusTagDescriptor> = {
  pending: {
    label: $localize`:@@imports.status.pending:Pending`,
    severity: 'neutral',
    icon: 'lucideClock',
  },
  processing: {
    label: $localize`:@@imports.status.processing:Processing`,
    severity: 'info',
    icon: 'lucideLoaderCircle',
  },
  completed: {
    label: $localize`:@@imports.status.completed:Completed`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  failed: {
    label: $localize`:@@imports.status.failed:Failed`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
};

/**
 * Function resolveImportStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an `ImportJobStatus` value. Falls
 * back to a neutral, humanised descriptor for an unknown value so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {ImportStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveImportStatusTag(value: string): ImportStatusTagDescriptor {
  return (
    IMPORT_STATUS[value as ImportJobStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
