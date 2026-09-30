/**
 * Interface UserProfilePort
 * @interface UserProfilePort
 *
 * @description
 * UserProfilePort
 * Account-owned contract published for approved external consumers that need
 * to bootstrap or clear the authenticated user profile without depending on
 * the concrete account store implementation.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserProfilePort {
  /**
   * Method initialize
   * @method initialize
   *
   * @description
   * Restores the account profile needed by approved consumers.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {Promise<void>} Resolves when profile initialization completes.
   */
  initialize(): Promise<void>;

  /**
   * Method load
   * @method load
   *
   * @description
   * Requests the current authenticated user's profile.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {void}
   */
  load(): void;

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Clears the profile after the owning account session ends.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {void}
   */
  clear(): void;
}
