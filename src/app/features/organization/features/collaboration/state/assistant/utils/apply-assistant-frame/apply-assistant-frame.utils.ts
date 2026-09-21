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
  let changed = false;
  const next = messages.map((message): AssistantMessageOutput => {
    if (message.id !== frame.messageId) return message;
    if (message.attemptId) {
      if (!frame.attemptId || (frame.attemptNumber ?? 0) < (message.attemptNumber ?? 0))
        return message;
      if ((frame.attemptNumber ?? 0) === (message.attemptNumber ?? 0)) {
        if (
          frame.attemptId !== message.attemptId ||
          (frame.attemptSequence ?? 0) <= (message.attemptSequence ?? 0)
        )
          return message;
        if (
          message.status === 'cancelled' ||
          message.status === 'complete' ||
          message.status === 'failed'
        )
          return message;
      }
    }
    changed = true;
    const active = frame.status === 'pending' || frame.status === 'streaming';
    return {
      ...message,
      body: frame.body,
      status: frame.status,
      errorCode: frame.errorCode ?? undefined,
      tokenCount: frame.tokenCount ?? undefined,
      attemptId: frame.attemptId ?? message.attemptId,
      attemptNumber: frame.attemptNumber ?? message.attemptNumber,
      attemptSequence: frame.attemptSequence ?? message.attemptSequence,
      attemptExpiresAt: frame.attemptExpiresAt ?? message.attemptExpiresAt,
      canCancel: frame.canCancel ?? (active && !!frame.attemptId),
      canRetry:
        frame.canRetry ??
        ((frame.attemptNumber ?? 0) > 0 &&
          (frame.status === 'failed' || frame.status === 'cancelled')),
    };
  });
  return changed ? next : messages;
}
