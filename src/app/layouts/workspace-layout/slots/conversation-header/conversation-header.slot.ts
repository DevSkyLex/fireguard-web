import { InjectionToken } from '@angular/core';
import type { ConversationHeaderContribution } from './conversation-header-contribution.interface';

/**
 * Constant CONVERSATION_HEADER_SLOT
 * @const CONVERSATION_HEADER_SLOT
 *
 * @description
 * Multi-provider injection token collecting every control registered for the
 * workspace conversation header tool cluster.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<ConversationHeaderContribution[]>}
 */
export const CONVERSATION_HEADER_SLOT: InjectionToken<ConversationHeaderContribution[]> =
  new InjectionToken<ConversationHeaderContribution[]>('CONVERSATION_HEADER_SLOT');
