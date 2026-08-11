/**
 * Interface OrganizationGeneralFormValues
 *
 * @description
 * The shape the general & branding form edits. Distinct from
 * `UpdateOrganizationInput`: the form always carries a string for each field,
 * while the transport DTO's `description` accepts `null` to clear it — the
 * page maps one to the other (`ARCHITECTURE.md` §10.4).
 *
 * @since 1.0.0
 */
export interface OrganizationGeneralFormValues {
  name: string;
  slug: string;
  description: string;
}
