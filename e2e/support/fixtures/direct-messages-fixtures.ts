import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { subjectConversationOutput, type ConversationOutputFixture } from './channel-fixtures';

/**
 * Function directConversationOutput
 * @function directConversationOutput
 *
 * @description
 * Real-contract direct conversation with a resolvable counterpart for messaging tests.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number} index - Stable conversation and counterpart suffix.
 * @returns {ConversationOutputFixture} Conversation in the authenticated organization.
 */
export function directConversationOutput(index = 2): ConversationOutputFixture {
  return {
    ...subjectConversationOutput({
      id: `e2e-direct-${index}`,
      '@id': `/api/conversations/e2e-direct-${index}`,
      organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
      subjectType: 'direct',
      visibility: 'participants',
      unreadCount: index === 2 ? 3 : 0,
    }),
    counterpartMember: `/api/organizations/members/e2e-member-${index}`,
  };
}
