import type { InterventionTimeJournalOutput } from './intervention-time-journal-output.interface';

/**
 * Type InterventionTimeJournalPage
 *
 * @description
 * One bounded authorized journal page stored independently from legacy complete snapshots.
 *
 * @type {InterventionTimeJournalPage}
 */
export type InterventionTimeJournalPage = Pick<
  InterventionTimeJournalOutput,
  'entries' | 'page' | 'itemsPerPage' | 'totalItems' | 'nextPage'
>;
