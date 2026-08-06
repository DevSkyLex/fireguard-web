/**
 * Interface OrganizationNavSource
 * @interface OrganizationNavSource
 *
 * @description
 * The two inputs the sidebar navigation is derived from: which organization the
 * URL selects, and what the active member may reach inside it.
 *
 * They are read as one value so the navigation can be recomputed from both at
 * once and keep its previous value when the first turns `null`.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationNavSource {
  /** Organization named by the URL, or `null` on a page that names none. */
  readonly organizationId: string | null;
  /** Effective permission names of the active member. */
  readonly permissions: ReadonlyArray<string>;
}
