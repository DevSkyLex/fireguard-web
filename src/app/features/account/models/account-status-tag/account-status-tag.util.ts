import type { AccountStatusTagDescriptor } from './account-status-tag-descriptor.interface';
import type { AccountStatusTagKind } from './account-status-tag-kind.type';

/**
 * Account status descriptors, mirroring the backend `UserStatus` enum.
 *
 * Colour code: green (`success`) for a healthy account, neutral (`secondary`)
 * for one that is merely dormant, amber (`warn`) while verification is still
 * outstanding, and red (`danger`) for a lockout — the only value that means
 * the account cannot be used right now.
 */
const ACCOUNT_STATUS: Record<string, AccountStatusTagDescriptor> = {
  active: {
    label: $localize`:@@account.status.active:Active`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  },
  inactive: {
    label: $localize`:@@account.status.inactive:Inactive`,
    severity: 'secondary',
    icon: 'pi pi-minus-circle',
  },
  locked: {
    label: $localize`:@@account.status.locked:Locked`,
    severity: 'danger',
    icon: 'pi pi-lock',
  },
  pending_verification: {
    label: $localize`:@@account.status.pendingVerification:Pending verification`,
    severity: 'warn',
    icon: 'pi pi-clock',
  },
};

/** Registry indexed by tag kind. */
const REGISTRY: Record<AccountStatusTagKind, Record<string, AccountStatusTagDescriptor>> = {
  accountStatus: ACCOUNT_STATUS,
};

/**
 * Resolves the presentation descriptor for an account status value.
 *
 * Falls back to a neutral, humanised descriptor for unknown values so a status
 * added backend-side still renders something rather than nothing.
 *
 * @param kind - Enum family to resolve against.
 * @param value - Raw status value.
 * @returns The matching descriptor, or a humanised fallback.
 */
export function resolveAccountStatusTag(
  kind: AccountStatusTagKind,
  value: string,
): AccountStatusTagDescriptor {
  return (
    REGISTRY[kind][value] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'secondary',
      icon: 'pi pi-tag',
    }
  );
}
