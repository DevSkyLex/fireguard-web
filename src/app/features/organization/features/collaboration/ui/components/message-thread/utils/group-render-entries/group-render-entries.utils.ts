import type {
  MessageRowEntry,
  MessageThreadEntry,
} from '@features/organization/features/collaboration/models';
import type { MessageThreadDayGroup, MessageThreadRenderGroup } from '../../models';

/**
 * One in-progress run, kept mutable while entries are folded into it and
 * frozen into a {@link MessageThreadRenderGroup} once the fold completes.
 */
interface MutableRunGroup {
  readonly kind: 'run';
  readonly key: string;
  readonly entries: MessageRowEntry[];
}

/**
 * Function groupRenderEntries
 * @function groupRenderEntries
 *
 * @description
 * Folds the flat, date-ruled entry list into what the thread actually draws:
 * a run of consecutive continuation messages becomes one group, so the
 * template can wrap it in a single `hlmMessageGroup` instead of hand-tuning a
 * margin between rows spartan already owns the spacing for.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly MessageThreadEntry[]} entries - Entries in render order.
 *
 * @returns {readonly MessageThreadRenderGroup[]} Groups in render order.
 *
 * @example
 * ```typescript
 * groupRenderEntries(buildThreadEntries(messages));
 * // [{ kind: 'day', … }, { kind: 'run', entries: [first, second] }]
 * ```
 */
export function groupRenderEntries(
  entries: readonly MessageThreadEntry[],
): readonly MessageThreadRenderGroup[] {
  const groups: (MessageThreadDayGroup | MutableRunGroup)[] = [];

  for (const entry of entries) {
    if (entry.kind === 'day') {
      groups.push({ kind: 'day', day: entry.day, at: entry.at });
      continue;
    }

    const last: MessageThreadDayGroup | MutableRunGroup | undefined = groups.at(-1);

    if (last?.kind === 'run' && entry.continuation) {
      last.entries.push(entry);
      continue;
    }

    groups.push({ kind: 'run', key: entry.message.id, entries: [entry] });
  }

  return groups;
}
