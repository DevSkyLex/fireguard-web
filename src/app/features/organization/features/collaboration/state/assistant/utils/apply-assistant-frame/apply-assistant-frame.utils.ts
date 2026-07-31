import type {
  AssistantFrame,
  AssistantMessageOutput,
} from '@features/organization/features/collaboration/models';

/**
 * Function applyAssistantFrame
 * @function applyAssistantFrame
 *
 * @description
 * Folds one Mercure frame into the transcript.
 *
 * The frame carries the **whole accumulated body**, not a delta, so the target
 * turn's text is replaced rather than appended to. Applying it directly is the
 * point: the documented realtime pattern elsewhere in this feature is
 * debounce-then-refetch, which here would re-read `body: ''` — the database
 * holds nothing until the reply completes.
 *
 * A frame for a turn that is not on screen is ignored rather than inserted:
 * without a `role` or a `createdAt` there is nothing to place it correctly
 * with, and the thread read is what fills gaps.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly AssistantMessageOutput[]} messages - Current transcript, oldest first.
 * @param {AssistantFrame} frame - Incoming update.
 *
 * @returns {readonly AssistantMessageOutput[]} The transcript after the frame.
 */
export function applyAssistantFrame(
  messages: readonly AssistantMessageOutput[],
  frame: AssistantFrame,
): readonly AssistantMessageOutput[] {
  return messages.map(
    (message: AssistantMessageOutput): AssistantMessageOutput =>
      message.id === frame.messageId
        ? {
            ...message,
            body: frame.body,
            status: frame.status,
            // Frames send explicit nulls where the HTTP contract omits the key;
            // normalizing here keeps one shape in state.
            errorCode: frame.errorCode ?? undefined,
            tokenCount: frame.tokenCount ?? undefined,
          }
        : message,
  );
}
