import {
  resolveInterventionTag,
  type InterventionGrouping,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import type {
  InterventionListGroup,
  InterventionListItemViewModel,
} from '../../models/intervention-list-item.interface';

/**
 * Lifecycle order the status grouping uses — the most actionable statuses
 * first, terminal statuses last.
 */
const STATUS_ORDER: readonly InterventionStatus[] = [
  'in_progress',
  'submitted',
  'changes_requested',
  'planned',
  'draft',
  'published',
  'abandoned',
];

/**
 * Milliseconds in a day, for bucketing deadlines.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Section keys the deadline grouping produces, in reading order: what is
 * already late, what is due now, what is coming, what is far off, and what
 * carries no deadline at all.
 */
const DUE_BUCKETS = ['overdue', 'today', 'week', 'later', 'none'] as const;

/**
 * Function bucketByDeadline
 *
 * @description
 * Which deadline section a row belongs to.
 *
 * @param {string | null | undefined} dueAt - Row deadline, ISO 8601.
 * @param {Date} now - Instant the buckets are anchored on.
 *
 * @returns {(typeof DUE_BUCKETS)[number]} The section key.
 *
 * @since 1.0.0
 */
function bucketByDeadline(
  dueAt: string | null | undefined,
  now: Date,
): (typeof DUE_BUCKETS)[number] {
  if (!dueAt) return 'none';

  const due: number = Date.parse(dueAt);
  if (Number.isNaN(due)) return 'none';

  const days: number = (due - now.getTime()) / MILLISECONDS_PER_DAY;

  if (days < 0) return 'overdue';
  if (days < 1) return 'today';
  if (days < 7) return 'week';

  return 'later';
}

/**
 * Function deadlineLabel
 *
 * @description
 * Localized heading of a deadline section.
 *
 * @param {(typeof DUE_BUCKETS)[number]} bucket - Section key.
 *
 * @returns {string} The heading.
 *
 * @since 1.0.0
 */
function deadlineLabel(bucket: (typeof DUE_BUCKETS)[number]): string {
  switch (bucket) {
    case 'overdue':
      return $localize`:@@intervention.group.overdue:Overdue`;
    case 'today':
      return $localize`:@@intervention.group.today:Due today`;
    case 'week':
      return $localize`:@@intervention.group.week:This week`;
    case 'later':
      return $localize`:@@intervention.group.later:Later`;
    case 'none':
      return $localize`:@@intervention.group.noDeadline:No deadline`;
  }
}

/**
 * Function groupInterventions
 *
 * @description
 * Sections the list render according to the active view's grouping.
 *
 * Empty sections are dropped, so the list never shows a heading with nothing
 * under it. Status sections keep the workflow's own order; every other grouping
 * is ordered by the section heading, because there is no meaningful order
 * between two sites.
 *
 * The instant is a parameter rather than read here so the function stays pure
 * and its spec stays deterministic.
 *
 * @param {readonly InterventionListItemViewModel[]} items - Rows to section.
 * @param {InterventionGrouping} grouping - How to section them.
 * @param {Date} now - Instant the deadline buckets are anchored on.
 * @param {(iri: string | null | undefined) => string | null} resolveResponsible - Member display name for an IRI.
 *
 * @returns {readonly InterventionListGroup[]} Non-empty sections, in reading order.
 *
 * @since 1.0.0
 */
export function groupInterventions(
  items: readonly InterventionListItemViewModel[],
  grouping: InterventionGrouping,
  now: Date,
  resolveResponsible: (iri: string | null | undefined) => string | null,
): readonly InterventionListGroup[] {
  if (grouping === 'status') {
    return STATUS_ORDER.map(
      (status): InterventionListGroup => ({
        id: status,
        label: resolveInterventionTag('status', status).label,
        isStatus: true,
        items: items.filter((item) => item.intervention.status === status),
      }),
    ).filter((group) => group.items.length > 0);
  }

  if (grouping === 'dueWindow') {
    return DUE_BUCKETS.map(
      (bucket): InterventionListGroup => ({
        id: `due-${bucket}`,
        label: deadlineLabel(bucket),
        isStatus: false,
        items: items.filter((item) => bucketByDeadline(item.intervention.dueAt, now) === bucket),
      }),
    ).filter((group) => group.items.length > 0);
  }

  const unassigned: string =
    grouping === 'site'
      ? $localize`:@@intervention.group.noSite:No site`
      : $localize`:@@intervention.group.unassigned:Unassigned`;

  const buckets = new Map<string, InterventionListItemViewModel[]>();

  for (const item of items) {
    const label: string =
      (grouping === 'site' ? item.siteName : resolveResponsible(item.intervention.responsible)) ??
      unassigned;

    const bucket: InterventionListItemViewModel[] | undefined = buckets.get(label);
    if (bucket) bucket.push(item);
    else buckets.set(label, [item]);
  }

  return [...buckets.entries()]
    .map(([label, bucketItems]): InterventionListGroup => {
      return { id: `${grouping}-${label}`, label, isStatus: false, items: bucketItems };
    })
    .toSorted((left, right) => {
      // The "unassigned" bucket reads last: it is an absence, not a peer.
      if (left.label === unassigned) return 1;
      if (right.label === unassigned) return -1;

      return left.label.localeCompare(right.label);
    });
}
