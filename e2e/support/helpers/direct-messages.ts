import type { Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { inspectorMessageOutput, messageOutput } from '../fixtures/channel-fixtures';
import { directConversationOutput } from '../fixtures/direct-messages-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationMemberOutput,
} from '../fixtures/member-fixtures';
import { ApiMock } from '../mocks/api-mock';

/**
 * Function mockMessagesWorkspace
 * @function mockMessagesWorkspace
 *
 * @description
 * Composes hermetic session, directory, list, thread and write endpoints for the
 * messaging layout. Additional conversations exercise long names and list scrolling.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Page} page - Isolated test page.
 * @param {number} count - Number of conversation rows to expose.
 * @returns {Promise<void>} Resolves when all messaging endpoints are registered.
 */
export async function mockMessagesWorkspace(page: Page, count = 2): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const conversations = Array.from({ length: count }, (_, index) =>
    directConversationOutput(index + 2),
  );
  const colleagues = Array.from({ length: count }, (_, index) =>
    inspectorOrganizationMemberOutput({
      id: `e2e-member-${index + 2}`,
      '@id': `/api/organizations/members/e2e-member-${index + 2}`,
      displayName:
        index === 0 ? 'Ines Pector' : `Alexandra Saint-Pierre — Site operations ${index + 2}`,
    }),
  );
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
    organizationMemberOutput(),
    ...colleagues,
  ]);
  await api.mockDirectConversationList(conversations);
  await api.mockDirectConversationOpen(directConversationOutput());
  await api.mockSavedMessages();
  await Promise.all(
    conversations.flatMap((conversation) => [
      api.mockChannelMessages(conversation.id, [
        messageOutput({
          conversation: `/api/conversations/${conversation.id}`,
          authorMember: `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1`,
          body: 'The north wing inspection is complete.',
        }),
        inspectorMessageOutput({
          conversation: `/api/conversations/${conversation.id}`,
          body: 'Thank you, I will review the report this afternoon.',
        }),
      ]),
      api.mockConversationMarkRead(conversation.id),
      api.mockChannelSubscription(conversation.id),
      api.mockMessagePost(conversation.id),
    ]),
  );
}
