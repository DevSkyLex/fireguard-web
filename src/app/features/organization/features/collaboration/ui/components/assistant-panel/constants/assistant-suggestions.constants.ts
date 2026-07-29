/**
 * Constant ASSISTANT_SUGGESTIONS
 * @const ASSISTANT_SUGGESTIONS
 *
 * @description
 * Opening prompts offered while the thread is empty.
 *
 * Rewritten from the prototype's channel-scoped set ("Summarise this thread",
 * "What's blocking the campaign?"): this assistant is organization-scoped and
 * is handed no conversation context, so a prompt about "this thread" would
 * quietly produce an answer about nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {readonly string[]}
 */
export const ASSISTANT_SUGGESTIONS: readonly string[] = [
  $localize`:@@workspace.assistant.suggestion.nonConformities:List the open non-conformities`,
  $localize`:@@workspace.assistant.suggestion.overdue:Which inspections are overdue?`,
  $localize`:@@workspace.assistant.suggestion.statusUpdate:Draft a status update for this week`,
  $localize`:@@workspace.assistant.suggestion.priorities:What should the team prioritise?`,
];

/**
 * Constant ASSISTANT_MAX_QUESTION_LENGTH
 * @const ASSISTANT_MAX_QUESTION_LENGTH
 *
 * @description
 * Longest question the ask endpoint accepts, in characters.
 *
 * @access public
 * @since 1.0.0
 *
 * @type {number}
 */
export const ASSISTANT_MAX_QUESTION_LENGTH = 8000;
