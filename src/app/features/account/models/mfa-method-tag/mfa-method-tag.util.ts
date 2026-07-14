import type { MfaMethodTagDescriptor } from './mfa-method-tag-descriptor.interface';
import type { MfaMethodTagKind } from './mfa-method-tag-kind.type';

/**
 * MFA method status descriptors.
 *
 * Colour code: blue (`info`) for the standing default method that is always
 * active (email code), green (`success`) for an active/enabled method,
 * amber (`warn`) for a pending secret awaiting confirmation, and neutral
 * (`secondary`) for a method that has not been set up yet.
 */
const METHOD_STATUS: Record<string, MfaMethodTagDescriptor> = {
  active: {
    label: $localize`:@@account.mfa.active:Active`,
    severity: 'info',
    icon: 'pi pi-check-circle',
  },
  enabled: {
    label: $localize`:@@account.mfa.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  pendingConfirmation: {
    label: $localize`:@@account.mfa.pendingConfirmation:Pending confirmation`,
    severity: 'warn',
    icon: 'pi pi-clock',
  },
  notSetUp: {
    label: $localize`:@@account.mfa.notSetUp:Not set up`,
    severity: 'secondary',
    icon: 'pi pi-minus-circle',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<MfaMethodTagKind, Record<string, MfaMethodTagDescriptor>> = {
  methodStatus: METHOD_STATUS,
};

/**
 * Resolves the presentation descriptor for an MFA method status value.
 *
 * Falls back to a neutral, label-only descriptor for unknown values so the UI
 * degrades gracefully instead of rendering nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw status value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveMfaMethodTag(kind: MfaMethodTagKind, value: string): MfaMethodTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-tag',
    }
  );
}
