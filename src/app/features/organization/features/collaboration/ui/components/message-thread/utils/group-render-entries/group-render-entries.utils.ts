import type {
  MessageRowEntry,
  MessageThreadEntry,
} from '@features/organization/features/collaboration/models';
import type { MessageThreadDayGroup, MessageThreadRenderGroup } from '../../models';

/**
 * Interface MutableRunGroup
 * @interface
 *
 * @description
 * frozen into a {@link MessageThreadRenderGroup} once the fold completes.
 */
interface MutableRunGroup {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the mutable run group variant represented by this value.
   *
   * @access public
   *
   * @type {'run'}
   */
  readonly kind: 'run';

  /**
   * Property key
   * @readonly
   *
   * @description
   * Identifies the message run used to keep adjacent rows grouped.
   *
   * @access public
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Contains the message rows grouped together for rendering.
   *
   * @access public
   *
   * @type {MessageRowEntry[]}
   */
  readonly entries: MessageRowEntry[];
}

/**
 * Function groupRenderEntries
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
 * @function groupRenderEntries
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
