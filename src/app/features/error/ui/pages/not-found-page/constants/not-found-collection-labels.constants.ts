/**
 * Constant NOT_FOUND_COLLECTION_LABELS
 * @const NOT_FOUND_COLLECTION_LABELS
 *
 * @description
 * Human labels for the collection segments the not-found page can offer as a
 * way back. Only segments listed here are recognised: the address that failed
 * is untrusted input, and a link built from an unknown segment would 404 again.
 *
 * The message ids are the navigation's own — the label a member reads here must
 * be the label they read in the sidebar, and one string deserves one id.
 *
 * @type {Readonly<Record<string, string>>}
 *
 * @since 1.0.0
 */
export const NOT_FOUND_COLLECTION_LABELS: Readonly<Record<string, string>> = {
  interventions: $localize`:@@route.interventions:Interventions`,
  facilities: $localize`:@@route.facilities:Facilities`,
  equipments: $localize`:@@route.equipments:Equipments`,
  inspections: $localize`:@@route.inspections:Inspections`,
  members: $localize`:@@route.members:Members`,
  team: $localize`:@@route.team:Team`,
  settings: $localize`:@@route.settings:Settings`,
};
