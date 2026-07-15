import type { OrganizationStatusTagDescriptor } from './organization-status-tag-descriptor.interface';
import type { OrganizationStatusTagKind } from './organization-status-tag-kind.type';

/**
 * Organization entity status descriptors (active / inactive).
 *
 * Colour code: green (`success`) for the operational state (active) and red
 * (`danger`) for the disabled state (inactive), each paired with an icon so
 * status is never conveyed by colour alone.
 */
const STATUS: Record<string, OrganizationStatusTagDescriptor> = {
  active: {
    label: $localize`:@@org.status.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  inactive: {
    label: $localize`:@@org.status.inactive:Inactive`,
    severity: 'danger',
    icon: 'pi pi-times-circle',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<
  OrganizationStatusTagKind,
  Record<string, OrganizationStatusTagDescriptor>
> = {
  status: STATUS,
};

/**
 * Resolves the presentation descriptor for an organization entity enum value.
 *
 * Falls back to a neutral, label-only descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveOrganizationStatusTag(
  kind: OrganizationStatusTagKind,
  value: string,
): OrganizationStatusTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-tag',
    }
  );
}
