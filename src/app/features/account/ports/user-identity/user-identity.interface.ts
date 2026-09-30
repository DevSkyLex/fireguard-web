import type { Signal } from '@angular/core';

/**
 * Interface ShellUserProfile
 * @interface ShellUserProfile
 *
 * @description
 * ShellUserProfile
 * Minimal user identity subset published by the account feature for
 * shell consumers such as layouts and account-adjacent widgets.
 * This is intentionally narrower than the full current-user profile contract.
 * The concrete adapter (UserStore) maps the full profile to this shape
 * by structural compatibility.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ShellUserProfile {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Canonical account identifier returned by the current profile API.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly id?: string | null;

  /**
   * Property sub
   * @readonly
   *
   * @description
   * Optional subject claim used as an identity fallback when no account ID is available.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly sub?: string | null;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Optional display name supplied by the authenticated profile.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly name?: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Optional email address supplied by the authenticated profile.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly email?: string | null;

  /**
   * Property picture
   * @readonly
   *
   * @description
   * Optional avatar URL supplied by the authenticated profile.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly picture?: string | null;
}

/**
 * Interface UserIdentityPort
 * @interface UserIdentityPort
 *
 * @description
 * UserIdentityPort
 * Feature-owned contract published by the account feature for consuming
 * authenticated user identity data outside the feature implementation.
 * Layouts and approved external consumers should inject this port instead
 * of depending on the concrete account UserStore.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserIdentityPort {
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Current shell-safe user profile, or null until no profile is available.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<ShellUserProfile | null>}
   */
  readonly profile: Signal<ShellUserProfile | null>;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Display name resolved for the authenticated user, when available.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<string | null>}
   */
  readonly displayName: Signal<string | null>;

  /**
   * Property initials
   * @readonly
   *
   * @description
   * Initials resolved for compact identity surfaces, when available.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<string | null>}
   */
  readonly initials: Signal<string | null>;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Full-size avatar URL (256px variant).
   *
   * @type {Signal<string | null>}
   */
  readonly avatarUrl: Signal<string | null>;

  /**
   * Property avatarUrlSmall
   * @readonly
   *
   * @description
   * Small avatar URL (64px variant) for menus and headers.
   *
   * @type {Signal<string | null>}
   */
  readonly avatarUrlSmall: Signal<string | null>;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Indicates whether the account profile is currently loading.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<boolean>}
   */
  readonly isLoading: Signal<boolean>;
}
