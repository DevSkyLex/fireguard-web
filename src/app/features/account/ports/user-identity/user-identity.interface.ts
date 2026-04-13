import type { Signal } from '@angular/core';

/**
 * ShellUserProfile
 * @interface ShellUserProfile
 *
 * @description
 * Minimal user identity subset published by the account feature for
 * shell consumers such as layouts and account-adjacent widgets.
 * This is intentionally narrower than the full OIDC userinfo contract.
 * The concrete adapter (UserStore) maps the full profile to this shape
 * by structural compatibility.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ShellUserProfile {
  readonly sub?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly picture?: string | null;
}

/**
 * UserIdentityPort
 * @interface UserIdentityPort
 *
 * @description
 * Feature-owned contract published by the account feature for consuming
 * authenticated user identity data outside the feature implementation.
 * Layouts and approved external consumers should inject this port instead
 * of depending on the concrete account UserStore.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserIdentityPort {
  readonly profile: Signal<ShellUserProfile | null>;
  readonly displayName: Signal<string | null>;
  readonly initials: Signal<string | null>;
  readonly avatarUrl: Signal<string | null>;
  readonly isLoading: Signal<boolean>;
}
