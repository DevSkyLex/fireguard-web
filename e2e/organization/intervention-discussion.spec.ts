import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_INTERVENTION_CONVERSATION_ID,
  inspectorMessageOutput,
  messageOutput,
  subjectConversationOutput,
} from '../support/fixtures/channel-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

const interventionId = 'e2e-detail-discussion-1';

const intervention = interventionOutput({
  id: interventionId,
  '@id': `/api/interventions/${interventionId}`,
  number: 402,
  name: 'Riser inspection — discussion',
  status: 'in_progress',
  responsible: E2E_MEMBER_IRI,
  allowedTransitions: ['submitted', 'changes_requested', 'abandoned'],
});

const conversation = subjectConversationOutput({
  subject: `/api/interventions/${interventionId}`,
  subjectLabel: intervention.name,
});

const firstMessage = messageOutput({
  conversation: `/api/conversations/${E2E_INTERVENTION_CONVERSATION_ID}`,
  body: 'Riser valve replaced, waiting on the pressure test.',
});

const secondMessage = inspectorMessageOutput({
  conversation: `/api/conversations/${E2E_INTERVENTION_CONVERSATION_ID}`,
});

/** Registers the session and every read the detail route's workspace + planning-options bursts fire on load. */
async function mockDetailPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(interventionId, []);
  await api.mockInterventionChanges(interventionId, []);
  await api.mockInterventionIssues(interventionId, []);
  await api.mockInterventionActivities(interventionId, []);
  await api.mockInterventionAttachments(interventionId, []);
  await api.mockInterventionFacilities(interventionId, []);
  await api.mockInterventionInspections(interventionId, []);
  await api.mockInterventionEquipment(interventionId, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
    organizationMemberOutput(),
    inspectorOrganizationMemberOutput(),
  ]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Intervention detail — live discussion', () => {
  test('exposes named comment mention options and inserts the chosen member from the keyboard', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await page.getByTestId('intervention-detail-menu').click();
    await page.getByTestId('intervention-detail-discussion-trigger').click();

    const comment = page.getByRole('textbox', { name: 'Comment' });
    await comment.fill('@In');
    const mentions = page.getByRole('listbox', { name: 'Members you can mention' });
    const ines = mentions.getByRole('option', { name: 'Ines Pector' });
    await expect(mentions).toBeVisible();
    await expect(ines).toHaveAttribute('aria-selected', 'true');
    const optionId = await ines.getAttribute('id');
    if (!optionId) throw new Error('The mention option must have a stable DOM id.');
    await expect(comment).toHaveAttribute('aria-activedescendant', optionId);
    await expect(comment).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(comment).toBeFocused();
    await expect(comment).toHaveValue('@Ines Pector ');
    await expect(mentions).toHaveCount(0);
  });

  test('opens the discussion sheet, renders the mocked thread, and appends a sent message', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    await api.mockSubjectConversationOpen(conversation);
    await api.mockChannelMessages(E2E_INTERVENTION_CONVERSATION_ID, [firstMessage, secondMessage]);
    await api.mockConversationMarkRead(E2E_INTERVENTION_CONVERSATION_ID);
    await api.mockChannelSubscription(E2E_INTERVENTION_CONVERSATION_ID);
    await api.mockMessagePost(E2E_INTERVENTION_CONVERSATION_ID);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);

    await detail.openDiscussion();

    await expect(detail.discussionSheet).toBeVisible();
    await expect(detail.discussionThread).toContainText(firstMessage.body ?? '');
    await expect(detail.discussionThread).toContainText(secondMessage.body ?? '');

    await detail.sendDiscussionMessage('Pressure test passed, closing out.');

    await expect(detail.discussionThread).toContainText('Pressure test passed, closing out.');

    await detail.closeDiscussion();

    await expect(detail.discussionSheet).toBeHidden();
    await expect(detail.unsavedChangesDialog).toBeHidden();
  });

  test('focuses the composer as soon as the discussion sheet opens', async ({ page }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    await api.mockSubjectConversationOpen(conversation);
    await api.mockChannelMessages(E2E_INTERVENTION_CONVERSATION_ID, [firstMessage]);
    await api.mockConversationMarkRead(E2E_INTERVENTION_CONVERSATION_ID);
    await api.mockChannelSubscription(E2E_INTERVENTION_CONVERSATION_ID);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);

    await detail.openDiscussion();

    await expect(detail.discussionComposerInput).toBeFocused();
  });

  test('guards an unsaved draft behind the shared unsaved-changes dialog on close', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    await api.mockSubjectConversationOpen(conversation);
    await api.mockChannelMessages(E2E_INTERVENTION_CONVERSATION_ID, [firstMessage]);
    await api.mockConversationMarkRead(E2E_INTERVENTION_CONVERSATION_ID);
    await api.mockChannelSubscription(E2E_INTERVENTION_CONVERSATION_ID);

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);

    await detail.openDiscussion();
    await detail.discussionComposerInput.fill('Draft not sent yet.');
    await expect(detail.discussionSheet).toHaveAttribute('data-dirty', 'true');

    await page.keyboard.press('Escape');

    await expect(detail.unsavedChangesDialog).toBeVisible();

    await detail.keepEditingDraft();

    await expect(detail.unsavedChangesDialog).toBeHidden();
    await expect(detail.discussionSheet).toBeVisible();
    await expect(detail.discussionComposerInput).toHaveValue('Draft not sent yet.');

    await page.keyboard.press('Escape');

    await expect(detail.unsavedChangesDialog).toBeVisible();

    await detail.discardDraftAndClose();

    await expect(detail.unsavedChangesDialog).toBeHidden();
    await expect(detail.discussionSheet).toBeHidden();
  });
});
