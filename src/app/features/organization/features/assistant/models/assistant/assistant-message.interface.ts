import type { HydraItem } from '@core/api/models';

/**
 * Who produced a message.
 *
 * @since 1.0.0
 */
export type AssistantRole = 'user' | 'assistant';

/**
 * Where an assistant answer stands.
 *
 * A `pending` answer has an empty body and fills in over Mercure, so renderers
 * must handle a message with no text yet rather than treating it as blank.
 *
 * @since 1.0.0
 */
export type AssistantMessageStatus = 'pending' | 'streaming' | 'completed' | 'failed';

/**
 * One turn in an assistant thread.
 *
 * @since 1.0.0
 */
export interface AssistantMessage extends HydraItem {
  readonly id: string;
  readonly threadId: string;
  readonly organizationId: string;
  readonly role: AssistantRole;
  readonly body: string;
  readonly status: AssistantMessageStatus;
  readonly errorCode: string | null;
  readonly tokenCount: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

/**
 * A thread with its loaded page of messages.
 *
 * @since 1.0.0
 */
export interface AssistantThread extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly memberId: string;
  readonly title: string | null;
  readonly model: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMessageAt: string | null;
  readonly messages: readonly AssistantMessage[];
}

/**
 * What asking a question returns: the question and the answer being produced.
 *
 * @since 1.0.0
 */
export interface AskAssistantOutput extends HydraItem {
  readonly threadId: string;
  readonly organizationId: string;
  readonly userMessage: AssistantMessage;
  readonly assistantMessage: AssistantMessage;
}
