/**
 * Interface AvatarUploadEvent
 * @interface AvatarUploadEvent
 *
 * @description
 * Minimal PrimeNG upload event contract consumed by the account avatar form.
 *
 * @since 1.0.0
 */
export interface AvatarUploadEvent {
  /**
   * Property files
   *
   * @description
   * Files selected by the user through the PrimeNG upload control.
   *
   * @type {File[]}
   */
  readonly files: File[];
}
