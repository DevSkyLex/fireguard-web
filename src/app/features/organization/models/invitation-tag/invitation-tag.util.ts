import type { InvitationTagDescriptor } from './invitation-tag-descriptor.interface';
import type { InvitationTagKind } from './invitation-tag-kind.type';

/**
 * Invitation status descriptors (pending → accepted / revoked / expired).
 *
 * Colour code: green (`success`) for the positive end state (accepted), red
 * (`danger`) for the destructive end state (revoked), amber (`warn`) for a
 * lapsed invitation that may be resent (expired), and blue (`info`) for the
 * neutral in-flight state (pending).
 */
const INVITATION_STATUS: Record<string, InvitationTagDescriptor> = {
  pending: {
    label: $localize`:@@org.invitationStatus.pending:Pending`,
    severity: 'info',
    icon: 'pi pi-clock',
  },
  accepted: {
    label: $localize`:@@org.invitationStatus.accepted:Accepted`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  revoked: {
    label: $localize`:@@org.invitationStatus.revoked:Revoked`,
    severity: 'danger',
    icon: 'pi pi-ban',
  },
  expired: {
    label: $localize`:@@org.invitationStatus.expired:Expired`,
    severity: 'warn',
    icon: 'pi pi-calendar-times',
  },
};

/** Member status descriptors (active / inactive). */
const MEMBER_STATUS: Record<string, InvitationTagDescriptor> = {
  active: {
    label: $localize`:@@org.memberStatus.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  inactive: {
    label: $localize`:@@org.memberStatus.inactive:Inactive`,
    severity: 'secondary',
    icon: 'pi pi-minus-circle',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<InvitationTagKind, Record<string, InvitationTagDescriptor>> = {
  invitationStatus: INVITATION_STATUS,
  memberStatus: MEMBER_STATUS,
};

/**
 * Resolves the presentation descriptor for an organization people-management
 * enum value.
 *
 * Falls back to a neutral, label-only descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw enum value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveInvitationTag(
  kind: InvitationTagKind,
  value: string,
): InvitationTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-tag',
    }
  );
}
