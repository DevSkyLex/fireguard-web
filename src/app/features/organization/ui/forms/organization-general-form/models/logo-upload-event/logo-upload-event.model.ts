/**
 * Interface LogoUploadEvent
 * @interface LogoUploadEvent
 *
 * @description
 * Minimal PrimeNG upload event contract consumed by the organization general
 * settings form for the logo picker.
 *
 * @since 1.0.0
 */
export interface LogoUploadEvent {
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
