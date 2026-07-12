import type { TagOption } from '@shared/components';
import type { InspectionTagDescriptor } from './inspection-tag-descriptor.interface';
import type { InspectionTagKind } from './inspection-tag-kind.type';

/**
 * Inspection status descriptors (draft → submitted → closed / cancelled).
 *
 * Colour code: blue (`info`) for the editable in-flight draft, amber (`warn`)
 * for a submitted inspection awaiting closure, grey (`secondary`) for the closed
 * end state, and red (`danger`) for a cancelled inspection.
 */
const STATUS: Record<string, InspectionTagDescriptor> = {
  draft: {
    label: $localize`:@@inspectionStatus.draft:Draft`,
    severity: 'info',
    icon: 'pi pi-file-edit',
  },
  submitted: {
    label: $localize`:@@inspectionStatus.submitted:Submitted`,
    severity: 'warn',
    icon: 'pi pi-send',
  },
  closed: {
    label: $localize`:@@inspectionStatus.closed:Closed`,
    severity: 'secondary',
    icon: 'pi pi-lock',
  },
  cancelled: {
    label: $localize`:@@inspectionStatus.cancelled:Cancelled`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
};

/** Inspection result descriptors (pass / partial / fail). */
const RESULT: Record<string, InspectionTagDescriptor> = {
  pass: {
    label: $localize`:@@inspectionResult.pass:Pass`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  partial: {
    label: $localize`:@@inspectionResult.partial:Partial`,
    severity: 'warn',
    icon: 'pi pi-exclamation-circle',
  },
  fail: {
    label: $localize`:@@inspectionResult.fail:Fail`,
    severity: 'danger',
    icon: 'pi pi-times-circle',
  },
};

/**
 * Non-conformity severity descriptors (low → medium → high → critical).
 *
 * Severity colour mirrors the non-conformity table: `secondary` for a low
 * finding, `warn` for medium, and `danger` for high/critical. The escalating
 * chevron icons match the dashboard severity legend.
 */
const NON_CONFORMITY_SEVERITY: Record<string, InspectionTagDescriptor> = {
  low: {
    label: $localize`:@@ncSeverity.low:Low`,
    severity: 'secondary',
    icon: 'pi pi-angle-down',
  },
  medium: {
    label: $localize`:@@ncSeverity.medium:Medium`,
    severity: 'warn',
    icon: 'pi pi-minus',
  },
  high: {
    label: $localize`:@@ncSeverity.high:High`,
    severity: 'danger',
    icon: 'pi pi-angle-up',
  },
  critical: {
    label: $localize`:@@ncSeverity.critical:Critical`,
    severity: 'danger',
    icon: 'pi pi-angle-double-up',
  },
};

/** Non-conformity status descriptors (open → in progress → done / waived). */
const NON_CONFORMITY_STATUS: Record<string, InspectionTagDescriptor> = {
  open: {
    label: $localize`:@@ncStatus.open:Open`,
    severity: 'danger',
    icon: 'pi pi-exclamation-circle',
  },
  in_progress: {
    label: $localize`:@@ncStatus.inProgress:In progress`,
    severity: 'warn',
    icon: 'pi pi-spinner',
  },
  done: {
    label: $localize`:@@ncStatus.done:Done`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  waived: {
    label: $localize`:@@ncStatus.waived:Waived`,
    severity: 'secondary',
    icon: 'pi pi-minus-circle',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<InspectionTagKind, Record<string, InspectionTagDescriptor>> = {
  status: STATUS,
  result: RESULT,
  nonConformitySeverity: NON_CONFORMITY_SEVERITY,
  nonConformityStatus: NON_CONFORMITY_STATUS,
};

/**
 * Resolves the presentation descriptor for an inspection-owned enum value.
 *
 * Falls back to a neutral, humanised descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveInspectionTag(
  kind: InspectionTagKind,
  value: string,
): InspectionTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-circle',
    }
  );
}

/**
 * Maps a tag family's known values to {@link TagOption} entries for filter and
 * status selects, preserving the registry's declaration order.
 *
 * @param kind - Enum family to enumerate.
 * @returns The family's descriptors paired with their enum value.
 */
export function inspectionTagOptions(kind: InspectionTagKind): TagOption[] {
  return Object.entries(REGISTRY[kind]).map(
    ([value, descriptor]: [string, InspectionTagDescriptor]): TagOption => ({
      value,
      label: descriptor.label,
      severity: descriptor.severity,
      icon: descriptor.icon,
    }),
  );
}
