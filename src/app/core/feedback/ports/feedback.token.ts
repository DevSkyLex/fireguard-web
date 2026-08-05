import { InjectionToken } from '@angular/core';
import type { FeedbackPort } from './feedback.interface';

/**
 * Constant FEEDBACK_PORT
 *
 * @description
 * Injection token for {@link FeedbackPort}, bound by `provideFeedback()` to the
 * concrete `FeedbackService`.
 *
 * @since 1.0.0
 */
export const FEEDBACK_PORT: InjectionToken<FeedbackPort> = new InjectionToken<FeedbackPort>(
  'FEEDBACK_PORT',
);
