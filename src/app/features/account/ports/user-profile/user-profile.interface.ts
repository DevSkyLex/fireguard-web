/**
 * UserProfilePort
 * @interface UserProfilePort
 *
 * @description
 * Account-owned contract published for approved external consumers that need
 * to bootstrap or clear the authenticated user profile without depending on
 * the concrete account store implementation.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserProfilePort {
  initialize(): Promise<void>;
  load(): void;
  clear(): void;
}
