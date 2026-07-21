/**
 * One result bucket of the organization's inspections.
 *
 * @since 1.0.0
 */
export interface InspectionResultBucket {
  readonly result: string;
  readonly count: number;
}

/**
 * The three results the API reports, worst outcome last.
 *
 * `total`, `draft`, `submitted` and `closed` are deliberately absent: they sit
 * in the same flat list but count inspections by workflow state, not by
 * outcome. Mixing them into a composition chart would draw the same inspection
 * twice and make the ring sum to more than the whole.
 */
const RESULT_KEYS: readonly string[] = ['pass', 'partial', 'fail'];

/**
 * Extracts the inspection result breakdown from a dashboard payload.
 *
 * The API flattens the `inspections` widget into one `{ key, value }` list
 * where the outcome counts sit next to the workflow-state counts, so the
 * results have to be picked out by key — the probing ARCHITECTURE §17.6 keeps
 * in an adapter.
 *
 * A result absent from the payload reads as zero rather than disappearing: no
 * failures is a fact about the estate, and a chart that silently drops slices
 * misreports its composition.
 *
 * @param {unknown} summary the `overview.inspections.summary` list
 *
 * @returns {readonly InspectionResultBucket[]} the three buckets, best outcome first
 */
export function adaptInspectionResult(summary: unknown): readonly InspectionResultBucket[] {
  const entries: readonly unknown[] = Array.isArray(summary) ? summary : [];
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;

    const key: unknown = (entry as Record<string, unknown>)['key'];
    const value: unknown = (entry as Record<string, unknown>)['value'];

    if (typeof key === 'string' && typeof value === 'number') {
      counts.set(key, value);
    }
  }

  return RESULT_KEYS.map(
    (result: string): InspectionResultBucket => ({ result, count: counts.get(result) ?? 0 }),
  );
}
