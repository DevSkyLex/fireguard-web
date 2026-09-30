import type { HydraItem } from '@core/api/models';

/**
 * Type AssistantMessageStatus
 *
 * @description
 * Lifecycle of an assistant reply.
 * Generation attempts have server-owned identities and deadlines. Cancellation is durable.
 * A user message is always `complete`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @type {string}
 * @type AssistantMessageStatus
 */
export type AssistantMessageStatus = 'pending' | 'streaming' | 'complete' | 'failed' | 'cancelled';

/**
 * Interface AssistantMessageOutput
 * @interface AssistantMessageOutput
 *
 * @description
 * One turn of an assistant thread, as embedded in the thread read and returned
 * by the ask endpoint.
 * Partial text is persisted under the active attempt identity and sequence.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantMessageOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this assistant message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property threadId
   * @readonly
   *
   * @description
   * Identifies the thread associated with this assistant message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly threadId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization associated with this assistant message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property role
   * @readonly
   *
   * @description
   * `user` or `assistant`.
   *
   * @access public
   *
   * @type {string}
   */
  readonly role: string;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Accumulated text of this attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this assistant message.
   *
   * @access public
   *
   * @type {AssistantMessageStatus}
   */
  readonly status: AssistantMessageStatus;

  /**
   * Property errorCode
   * @readonly
   *
   * @description
   * Omitted, not null, on the HTTP contract. Frames send an explicit `null`.
   *
   * @access public
   *
   * @type {string}
   */
  readonly errorCode?: string;

  /**
   * Property tokenCount
   * @readonly
   *
   * @description
   * Reports the number of tokens accumulated in the assistant response.
   *
   * @access public
   *
   * @type {number}
   */
  readonly tokenCount?: number;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this assistant message was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property completedAt
   * @readonly
   *
   * @description
   * Records when the assistant message completed.
   *
   * @access public
   *
   * @type {string}
   */
  readonly completedAt?: string;

  /**
   * Property attemptId
   * @readonly
   *
   * @description
   * Identifies the attempt associated with this assistant message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly attemptId?: string;

  /**
   * Property attemptNumber
   * @readonly
   *
   * @description
   * Indicates the position of this attempt in the execution sequence.
   *
   * @access public
   *
   * @type {number}
   */
  readonly attemptNumber?: number;

  /**
   * Property attemptSequence
   * @readonly
   *
   * @description
   * Orders attempts produced while answering the current question.
   *
   * @access public
   *
   * @type {number}
   */
  readonly attemptSequence?: number;

  /**
   * Property attemptExpiresAt
   * @readonly
   *
   * @description
   * Marks when the current attempt lease expires.
   *
   * @access public
   *
   * @type {string}
   */
  readonly attemptExpiresAt?: string;

  /**
   * Property canCancel
   * @readonly
   *
   * @description
   * Indicates whether the server allows this response to be cancelled.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canCancel?: boolean;

  /**
   * Property canRetry
   * @readonly
   *
   * @description
   * Indicates whether the server allows this attempt to be retried.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canRetry?: boolean;
}

/**
 * Interface AssistantThreadOutput
 * @interface AssistantThreadOutput
 *
 * @description
 * An assistant thread, without its messages.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantThreadOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this assistant thread.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization associated with this assistant thread.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Identifies the organization member associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Provides the title displayed for this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly title?: string;

  /**
   * Property model
   * @readonly
   *
   * @description
   * Names the assistant model used for this thread.
   *
   * @access public
   *
   * @type {string}
   */
  readonly model?: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this assistant thread was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Records when this assistant thread was last updated.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property lastMessageAt
   * @readonly
   *
   * @description
   * Records when the conversation most recently received a message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly lastMessageAt?: string;
}

/**
 * Interface AssistantThreadDetailOutput
 * @interface AssistantThreadDetailOutput
 *
 * @description
 * A thread with one page of its messages embedded.
 * The page metadata lives in the body rather than in a Hydra envelope, and the
 * messages come back **oldest first with a plain offset** — so page 1 is the
 * *start* of the conversation, not the latest turn. Showing the tail means
 * reading `messagesTotal` first and asking for the last page.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantThreadDetailOutput extends AssistantThreadOutput {
  /**
   * Property messages
   * @readonly
   *
   * @description
   * Contains the assistant messages included in this thread detail.
   *
   * @access public
   *
   * @type {readonly AssistantMessageOutput[]}
   */
  readonly messages: readonly AssistantMessageOutput[];

  /**
   * Property messagesPage
   * @readonly
   *
   * @description
   * Identifies the current page of assistant messages.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesPage: number;

  /**
   * Property messagesItemsPerPage
   * @readonly
   *
   * @description
   * Reports the number of assistant messages requested per page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesItemsPerPage: number;

  /**
   * Property messagesTotal
   * @readonly
   *
   * @description
   * Reports the total number of assistant messages available in the thread.
   *
   * @access public
   *
   * @type {number}
   */
  readonly messagesTotal: number;
}

/**
 * Interface AskAssistantQuestionInput
 * @interface AskAssistantQuestionInput
 *
 * @description
 * Body of the ask endpoint.
 * `temperature` is deliberately never sent: it is optional, the generation
 * ignores the organization's configured model anyway, and leaving sampling to
 * the operator is the safer default.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AskAssistantQuestionInput {
  /**
   * Property body
   * @readonly
   *
   * @description
   * Non-blank, 8000 characters maximum.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body: string;
}

/**
 * Interface AskAssistantQuestionOutput
 * @interface AskAssistantQuestionOutput
 *
 * @description
 * The two turns the ask endpoint creates: what was asked, and the reply
 * placeholder that will be filled over Mercure.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AskAssistantQuestionOutput extends HydraItem {
  /**
   * Property threadId
   * @readonly
   *
   * @description
   * Identifies the thread associated with this ask assistant question.
   *
   * @access public
   *
   * @type {string}
   */
  readonly threadId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization associated with this ask assistant question.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property userMessage
   * @readonly
   *
   * @description
   * Contains the user message created by this question.
   *
   * @access public
   *
   * @type {AssistantMessageOutput}
   */
  readonly userMessage: AssistantMessageOutput;

  /**
   * Property assistantMessage
   * @readonly
   *
   * @description
   * Always `pending` here — the only place that status is ever observed.
   *
   * @access public
   *
   * @type {AssistantMessageOutput}
   */
  readonly assistantMessage: AssistantMessageOutput;
}

/**
 * Interface AssistantFrame
 * @interface AssistantFrame
 *
 * @description
 * One Mercure update on an assistant thread's topic.
 * Every frame carries the **whole accumulated body**, not a delta, so applying
 * one means replacing the bubble's text rather than appending to it.
 * Unlike the HTTP contract, frames are a raw `json_encode` that bypasses API
 * Platform's serializer: `tokenCount` and `errorCode` arrive as explicit
 * `null`, not omitted. That is why they are nullable here and optional above.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantFrame {
  /**
   * Property messageId
   * @readonly
   *
   * @description
   * Identifies the message addressed by this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly messageId: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this assistant frame.
   *
   * @access public
   *
   * @type {AssistantMessageStatus}
   */
  readonly status: AssistantMessageStatus;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Contains the message text shown in the conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property tokenCount
   * @readonly
   *
   * @description
   * Reports the number of tokens accumulated in the assistant response.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly tokenCount: number | null;

  /**
   * Property errorCode
   * @readonly
   *
   * @description
   * Carries the machine-readable code for a failed operation, when present.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly errorCode: string | null;

  /**
   * Property attemptId
   * @readonly
   *
   * @description
   * Identifies the attempt associated with this assistant frame.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly attemptId?: string | null;

  /**
   * Property attemptNumber
   * @readonly
   *
   * @description
   * Indicates the position of this attempt in the execution sequence.
   *
   * @access public
   *
   * @type {number}
   */
  readonly attemptNumber?: number;

  /**
   * Property attemptSequence
   * @readonly
   *
   * @description
   * Orders attempts produced while answering the current question.
   *
   * @access public
   *
   * @type {number}
   */
  readonly attemptSequence?: number;

  /**
   * Property attemptExpiresAt
   * @readonly
   *
   * @description
   * Marks when the current attempt lease expires.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly attemptExpiresAt?: string | null;

  /**
   * Property canCancel
   * @readonly
   *
   * @description
   * Indicates whether the server allows this response to be cancelled.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canCancel?: boolean;

  /**
   * Property canRetry
   * @readonly
   *
   * @description
   * Indicates whether the server allows this attempt to be retried.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canRetry?: boolean;
}

/**
 * Interface AssistantSubscriptionOutput
 * @interface AssistantSubscriptionOutput
 *
 * @description
 * Credentials for one thread's Mercure topic.
 * The token carries an explicit `exp` 900 seconds out and nothing re-mints it
 * server-side, so a panel left open longer than that must ask again.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantSubscriptionOutput extends HydraItem {
  /**
   * Property token
   * @readonly
   *
   * @description
   * Carries the short-lived credential used to subscribe to the assistant response.
   *
   * @access public
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property topic
   * @readonly
   *
   * @description
   * Identifies the Mercure topic for assistant response updates.
   *
   * @access public
   *
   * @type {string}
   */
  readonly topic: string;
}
