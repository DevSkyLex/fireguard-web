import type { TagOption } from '@shared/tag';
import type { FacilityTagDescriptor } from './facility-tag-descriptor.interface';
import type { FacilityTagKind } from './facility-tag-kind.type';

/**
 * Facility status descriptors (active / archived).
 *
 * Colour code: green (`success`) for an active facility and grey (`secondary`)
 * for an archived one.
 */
const STATUS: Record<string, FacilityTagDescriptor> = {
  active: {
    label: $localize`:@@status.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  archived: {
    label: $localize`:@@status.archived:Archived`,
    severity: 'secondary',
    icon: 'pi pi-box',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<FacilityTagKind, Record<string, FacilityTagDescriptor>> = {
  status: STATUS,
};

/**
 * Resolves the presentation descriptor for a facility-owned enum value.
 *
 * Falls back to a neutral, humanised descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveFacilityTag(kind: FacilityTagKind, value: string): FacilityTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-circle',
    }
  );
}

/**
 * Maps a tag family's known values to {@link TagOption} entries for filter
 * selects, preserving the registry's declaration order.
 *
 * @param kind - Enum family to enumerate.
 * @returns The family's descriptors paired with their enum value.
 */
export function facilityTagOptions(kind: FacilityTagKind): TagOption[] {
  return Object.entries(REGISTRY[kind]).map(
    ([value, descriptor]: [string, FacilityTagDescriptor]): TagOption => ({
      value,
      label: descriptor.label,
      severity: descriptor.severity,
      icon: descriptor.icon,
    }),
  );
}
