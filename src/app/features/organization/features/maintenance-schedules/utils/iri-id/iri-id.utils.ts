/**
 * Function iriId
 *
 * @description
 * The trailing identifier segment of a Hydra IRI, e.g. `/api/equipment/{id}`
 * → `{id}`. `MaintenanceScheduleOutput.equipment` and `.facility` are IRIs,
 * not bare ids, and the table links to this feature's sibling record routes
 * by id — this is the one place that split happens.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} iri - The IRI to read the trailing segment from.
 *
 * @returns {string} The trailing segment, or the input unchanged when it carries no slash.
 */
export function iriId(iri: string): string {
  const segments: readonly string[] = iri.split('/');

  return segments[segments.length - 1] ?? iri;
}
