/**
 * Interface OrganizationPageHeaderOrganization
 * @interface OrganizationPageHeaderOrganization
 *
 * @description
 * The slice of `OrganizationOutput` the header needs to identify the
 * organization. Narrowed and made mostly optional rather than reusing
 * `OrganizationOutput` directly, so a caller that has not finished resolving
 * the full resource — or that only ever loads a subset of it — can still
 * render the header without conjuring placeholder values for fields it does
 * not have.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationPageHeaderOrganization {
  /** Organization name, shown beside the avatar and used for its initials fallback. */
  readonly name: string;
  /** Logo URL; the initials fallback renders when absent. */
  readonly logoUrl?: string | null;
  /** Raw backend status; a badge renders only when it denotes a non-active organization. */
  readonly status?: string | null;
  /** Plan name, shown as a badge when present. */
  readonly planName?: string | null;
  /** Member count, shown as a muted line when present. */
  readonly memberCount?: number | null;
}
