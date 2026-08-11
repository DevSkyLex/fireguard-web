import type { InspectionResult, InspectionStatus } from '../inspection/inspection-output.interface';
import type { NonConformitySeverity } from '../non-conformity/non-conformity-output.interface';
import type { InspectionStatusTagDescriptor } from './inspection-status-tag-descriptor.interface';
import type { InspectionStatusTagKind } from './inspection-status-tag-kind.type';

/**
 * Workflow status descriptors (draft → submitted → closed, with `cancelled`
 * as the other terminal). Reuses the exact `inspectionStatus.*` i18n ids,
 * labels, severities and icons `intervention-tag.util.ts`'s own registry
 * already defined for the same enum (one translation, two call sites) when
 * it renders an inspection read-only on the intervention detail page's
 * Linked tab.
 */
const STATUS: Record<InspectionStatus, InspectionStatusTagDescriptor> = {
  draft: {
    label: $localize`:@@inspectionStatus.draft:Draft`,
    severity: 'neutral',
    icon: 'lucideCircleDotDashed',
  },
  submitted: {
    label: $localize`:@@inspectionStatus.submitted:Submitted`,
    severity: 'neutral',
    icon: 'lucideSend',
  },
  closed: {
    label: $localize`:@@inspectionStatus.closed:Closed`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  cancelled: {
    label: $localize`:@@inspectionStatus.cancelled:Cancelled`,
    severity: 'danger',
    icon: 'lucideX',
  },
};

/**
 * Result descriptors. Reuses the exact `inspectionResult.*` i18n ids, labels,
 * severities and icons `intervention-tag.util.ts`'s own registry already
 * defined for the same enum, for the same one-translation-two-call-sites
 * reason as {@link STATUS}.
 */
const RESULT: Record<InspectionResult, InspectionStatusTagDescriptor> = {
  pass: {
    label: $localize`:@@inspectionResult.pass:Pass`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  partial: {
    label: $localize`:@@inspectionResult.partial:Partial`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  fail: {
    label: $localize`:@@inspectionResult.fail:Fail`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
};

/**
 * Non-conformity severity descriptors, ordered by escalating urgency. Reused
 * by the organization statistics page's severity breakdown so a severity
 * level never renders as a bare count without its label and icon
 * (`ARCHITECTURE.md` §10.10, `PRODUCT.md`'s no-colour-alone rule).
 */
const NON_CONFORMITY_SEVERITY: Record<NonConformitySeverity, InspectionStatusTagDescriptor> = {
  low: {
    label: $localize`:@@nonConformitySeverity.low:Low`,
    severity: 'neutral',
    icon: 'lucideCircleDotDashed',
  },
  medium: {
    label: $localize`:@@nonConformitySeverity.medium:Medium`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  high: {
    label: $localize`:@@nonConformitySeverity.high:High`,
    severity: 'danger',
    icon: 'lucideTriangleAlert',
  },
  critical: {
    label: $localize`:@@nonConformitySeverity.critical:Critical`,
    severity: 'danger',
    icon: 'lucideOctagonAlert',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<InspectionStatusTagKind, Record<string, InspectionStatusTagDescriptor>> = {
  status: STATUS,
  result: RESULT,
  nonConformitySeverity: NON_CONFORMITY_SEVERITY,
};

/**
 * Function resolveInspectionStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an inspection status/result enum
 * value. Falls back to a neutral, humanised descriptor for an unknown value
 * so the UI degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InspectionStatusTagKind} kind - Enum family to resolve against.
 * @param {string} value - Raw enum value.
 *
 * @returns {InspectionStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveInspectionStatusTag(
  kind: InspectionStatusTagKind,
  value: string,
): InspectionStatusTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
