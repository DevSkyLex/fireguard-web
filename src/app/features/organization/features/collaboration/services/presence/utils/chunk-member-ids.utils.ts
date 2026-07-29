import { PRESENCE_BATCH_SIZE } from '@features/organization/features/collaboration/data-access';

/**
 * Function chunkMemberIds
 * @function chunkMemberIds
 *
 * @description
 * Normalizes a member-reference list into batches the presence endpoint
 * accepts.
 *
 * Three things happen here, each because the server demands it: IRIs are
 * reduced to bare ids (the provider parses IRIs for `organization` only),
 * duplicates are dropped (the server dedups *before* checking the cap, so
 * sending 120 references with 40 repeats is legal and would otherwise be
 * rejected client-side for nothing), and the result is split at the cap —
 * exceeding it is a `400`, not a truncation.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly string[]} memberRefs - Bare member ids or member IRIs, mixed.
 *
 * @returns {readonly (readonly string[])[]} Batches of at most 100 unique bare ids.
 */
export function chunkMemberIds(memberRefs: readonly string[]): readonly (readonly string[])[] {
  const unique: readonly string[] = [
    ...new Set(
      memberRefs
        .map((reference: string): string => reference.slice(reference.lastIndexOf('/') + 1).trim())
        .filter((id: string): boolean => id.length > 0),
    ),
  ];

  const batches: string[][] = [];

  for (let index = 0; index < unique.length; index += PRESENCE_BATCH_SIZE) {
    batches.push(unique.slice(index, index + PRESENCE_BATCH_SIZE));
  }

  return batches;
}
