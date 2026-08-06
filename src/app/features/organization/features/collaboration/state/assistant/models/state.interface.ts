import type { CallState } from '@core/request-state';
import type { AssistantMessageOutput } from '@features/organization/features/collaboration/models';

/**
 * Interface AssistantState
 * @interface AssistantState
 *
 * @description
 * State of {@link AssistantStore}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantState {
  /** Thread being shown, created lazily on the first question. */
  readonly threadId: string | null;
  /** Mercure topic of that thread, or `null` before subscribing. */
  readonly topic: string | null;
  /**
   * The visible turns, oldest first.
   *
   * Held whole rather than in an entity collection: a transcript is read in
   * order and never looked up by id from the outside, and the streaming reply
   * is replaced wholesale on every frame.
   */
  readonly messages: readonly AssistantMessageOutput[];
  /**
   * Server-reported total, so the panel can say that earlier turns exist
   * without pretending it can page to them.
   */
  readonly messagesTotal: number;
  /** Opening the thread and reading its last page. */
  readonly threadCallState: CallState;
  /** Posting a question. */
  readonly askCallState: CallState;
  /**
   * Id of the reply currently being generated, or `null`.
   *
   * Tracked separately from the message list because a reply that stalls has
   * no terminal frame and no server-side deadline — something has to remember
   * what we are waiting for.
   */
  readonly generatingMessageId: string | null;
  /** Whether the generation has been waiting long enough to look stuck. */
  readonly generationStalled: boolean;
  /**
   * Whether the panel is claiming the shell's mono-active contextual column.
   *
   * Held here rather than in the shell because the slot contract is a signal
   * per contribution, and both the header toggle and the panel's own close
   * button have to agree on one answer.
   */
  readonly panelOpen: boolean;
}
