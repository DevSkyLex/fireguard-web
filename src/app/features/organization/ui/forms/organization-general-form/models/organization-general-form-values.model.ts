/**
 * Interface OrganizationGeneralFormValues
 * @interface OrganizationGeneralFormValues
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
  /**
   * Property name
   *
   * @description
   * Holds the editable organization name before the page maps the form to its API input.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  name: string;

  /**
   * Property slug
   *
   * @description
   * Holds the editable organization slug submitted with the general settings.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  slug: string;

  /**
   * Property description
   *
   * @description
   * Keeps an empty string in the form model; the page converts it to null when clearing the API
   * value.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  description: string;
}
