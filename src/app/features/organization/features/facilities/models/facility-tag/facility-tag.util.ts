import type { TagOption } from '@shared/components';
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

/**
 * Facility type descriptors (site / building / floor / zone / area).
 *
 * Types are structural, not a verdict, so every one is `secondary`: only the
 * icon distinguishes them. Declaration order is the hierarchy order, which
 * `facilityTagOptions` preserves for filter selects.
 */
const TYPE: Record<string, FacilityTagDescriptor> = {
  site: { label: $localize`:@@facilityType.site:Site`, severity: 'secondary', icon: 'pi pi-globe' },
  building: {
    label: $localize`:@@facilityType.building:Building`,
    severity: 'secondary',
    icon: 'pi pi-building',
  },
  floor: {
    label: $localize`:@@facilityType.floor:Floor`,
    severity: 'secondary',
    icon: 'pi pi-th-large',
  },
  zone: { label: $localize`:@@facilityType.zone:Zone`, severity: 'secondary', icon: 'pi pi-map' },
  area: {
    label: $localize`:@@facilityType.area:Area`,
    severity: 'secondary',
    icon: 'pi pi-map-marker',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<FacilityTagKind, Record<string, FacilityTagDescriptor>> = {
  status: STATUS,
  type: TYPE,
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
