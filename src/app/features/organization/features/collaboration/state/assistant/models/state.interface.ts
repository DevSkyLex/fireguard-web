import type { CallState } from '@core/request-state';
import type {
  AssistantMessageOutput,
  AssistantThreadOutput,
} from '@features/organization/features/collaboration/models';

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
  /**
   * Property threads
   * @readonly
   *
   * @description
   * Current server page of private conversation history.
   *
   * @access public
   *
   * @type {readonly AssistantThreadOutput[]}
   */
  readonly threads: readonly AssistantThreadOutput[];

  /**
   * Property historyPage
   * @readonly
   *
   * @description
   * One-based private conversation page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly historyPage: number;

  /**
   * Property historyTotal
   * @readonly
   *
   * @description
   * Server count of the member's conversations.
   *
   * @access public
   *
   * @type {number}
   */
  readonly historyTotal: number;

  /**
   * Property historyCallState
   * @readonly
   *
   * @description
   * Independent request state for the history picker.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly historyCallState: CallState;

  /**
   * Property messagesPage
   * @readonly
   *
   * @description
   * Earliest loaded message page; zero until the first thread read.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesPage: number;

  /**
   * Property earlierCallState
   * @readonly
   *
   * @description
   * Independent request state for loading older turns.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly earlierCallState: CallState;

  /**
   * Property threadId
   *
   * @description
   * Thread being shown, created lazily on the first question.
   */
  readonly threadId: string | null;
  /**
   * Property topic
   *
   * @description
   * Mercure topic of that thread, or `null` before subscribing.
   */
  readonly topic: string | null;
  /**
   * Property messages
   *
   * @description
   * The visible turns, oldest first.
   * Held whole rather than in an entity collection: a transcript is read in
   * order and never looked up by id from the outside, and the streaming reply
   * is replaced wholesale on every frame.
   */
  readonly messages: readonly AssistantMessageOutput[];
  /**
   * Property messagesTotal
   *
   * @description
   * Server-reported total, so the panel can say that earlier turns exist
   * without pretending it can page to them.
   */
  readonly messagesTotal: number;
  /**
   * Property threadCallState
   *
   * @description
   * Opening the thread and reading its last page.
   */
  readonly threadCallState: CallState;
  /**
   * Property askCallState
   *
   * @description
   * Posting a question.
   */
  readonly askCallState: CallState;
  /**
   * Property controlCallState
   *
   * @description
   * Serialized cancellation/retry request, independent of asking and reading.
   */
  readonly controlCallState: CallState;
  /**
   * Property generatingMessageId
   *
   * @description
   * Id of the reply currently being generated, or `null`.
   * Tracked separately from the message list because a reply that stalls has
   * no terminal frame; the server deadline and status remain authoritative.
   */
  readonly generatingMessageId: string | null;
  /**
   * Property generationStalled
   *
   * @description
   * Whether the generation has been waiting long enough to look stuck.
   */
  readonly generationStalled: boolean;
  /**
   * Property panelOpen
   *
   * @description
   * Whether the assistant sheet is open.
   * Held in the store rather than in the toggle because the header trigger and
   * the panel's own close button have to agree on one answer, and the
   * trigger's `aria-expanded` reads the same flag the sheet does.
   */
  readonly panelOpen: boolean;
}
