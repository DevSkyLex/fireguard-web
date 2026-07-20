import type { OrganizationStatusTagDescriptor } from './organization-status-tag-descriptor.interface';
import type { OrganizationStatusTagKind } from './organization-status-tag-kind.type';

/**
 * Organization entity status descriptors.
 *
 * `active`, `suspended` and `archived` are the values the backend
 * `OrganizationStatus` enum can send; `inactive` predates them and is kept so
 * any older payload still resolves rather than falling through.
 *
 * Colour code: green (`success`) while the workspace is usable, red (`danger`)
 * when it has been cut off (suspended, inactive), and neutral (`secondary`)
 * when it is merely retired — archived is an end state, not an alarm. Each is
 * paired with an icon so status is never conveyed by colour alone.
 */
const STATUS: Record<string, OrganizationStatusTagDescriptor> = {
  active: {
    label: $localize`:@@org.status.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  suspended: {
    label: $localize`:@@org.status.suspended:Suspended`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
  archived: {
    label: $localize`:@@org.status.archived:Archived`,
    severity: 'secondary',
    icon: 'pi pi-inbox',
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
