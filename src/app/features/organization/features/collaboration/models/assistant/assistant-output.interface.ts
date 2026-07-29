import type { HydraItem } from '@core/api/models';

/**
 * Type AssistantMessageStatus
 * @typedef AssistantMessageStatus
 *
 * @description
 * Lifecycle of an assistant reply.
 *
 * There is no `cancelled`: the backend exposes no cancel endpoint, and no
 * server-side wall-clock deadline ever settles a stuck row — a reply whose
 * worker died stays `streaming` forever. The client has to notice that itself.
 *
 * A user message is always `complete`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type AssistantMessageStatus = 'pending' | 'streaming' | 'complete' | 'failed';

/**
 * Interface AssistantMessageOutput
 * @interface AssistantMessageOutput
 *
 * @description
 * One turn of an assistant thread, as embedded in the thread read and returned
 * by the ask endpoint.
 *
 * {@link body} is empty until {@link status} reaches `complete`: partial text
 * is never persisted, so re-reading a thread mid-generation returns nothing.
 * The text only exists in the Mercure frames while it is being produced.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantMessageOutput {
  readonly id: string;
  readonly threadId: string;
  readonly organizationId: string;
  /** `user` or `assistant`. */
  readonly role: string;
  /** Empty while pending or streaming — see the class note. */
  readonly body: string;
  readonly status: AssistantMessageStatus;
  /** Omitted, not null, on the HTTP contract. Frames send an explicit `null`. */
  readonly errorCode?: string;
  readonly tokenCount?: number;
  readonly createdAt: string;
  readonly completedAt?: string;
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
  readonly id: string;
  readonly organizationId: string;
  readonly memberId: string;
  readonly title?: string;
  readonly model?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMessageAt?: string;
}

/**
 * Interface AssistantThreadDetailOutput
 * @interface AssistantThreadDetailOutput
 *
 * @description
 * A thread with one page of its messages embedded.
 *
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
  readonly messages: readonly AssistantMessageOutput[];
  readonly messagesPage: number;
  readonly messagesItemsPerPage: number;
  readonly messagesTotal: number;
}

/**
 * Interface AskAssistantQuestionInput
 * @interface AskAssistantQuestionInput
 *
 * @description
 * Body of the ask endpoint.
 *
 * `temperature` is deliberately never sent: it is optional, the generation
 * ignores the organization's configured model anyway, and leaving sampling to
 * the operator is the safer default.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AskAssistantQuestionInput {
  /** Non-blank, 8000 characters maximum. */
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
  readonly threadId: string;
  readonly organizationId: string;
  readonly userMessage: AssistantMessageOutput;
  /** Always `pending` here — the only place that status is ever observed. */
  readonly assistantMessage: AssistantMessageOutput;
}

/**
 * Interface AssistantFrame
 * @interface AssistantFrame
 *
 * @description
 * One Mercure update on an assistant thread's topic.
 *
 * Every frame carries the **whole accumulated body**, not a delta, so applying
 * one means replacing the bubble's text rather than appending to it.
 *
 * Unlike the HTTP contract, frames are a raw `json_encode` that bypasses API
 * Platform's serializer: `tokenCount` and `errorCode` arrive as explicit
 * `null`, not omitted. That is why they are nullable here and optional above.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantFrame {
  readonly messageId: string;
  readonly status: AssistantMessageStatus;
  readonly body: string;
  readonly tokenCount: number | null;
  readonly errorCode: string | null;
}

/**
 * Interface AssistantSubscriptionOutput
 * @interface AssistantSubscriptionOutput
 *
 * @description
 * Credentials for one thread's Mercure topic.
 *
 * The token carries an explicit `exp` 900 seconds out and nothing re-mints it
 * server-side, so a panel left open longer than that must ask again.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AssistantSubscriptionOutput extends HydraItem {
  readonly token: string;
  readonly topic: string;
}
