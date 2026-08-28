import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { MessageEditDialog } from '../message-edit-dialog.component';

const MEMBER_ID = '7f1c0000-0000-0000-0000-000000000000';

function message(overrides: Partial<MessageOutput> = {}): MessageOutput {
  return {
    '@id': '/api/messages/message-1',
    '@type': 'Message',
    id: 'message-1',
    conversation: '/api/conversations/conversation-1',
    authorMember: '/api/organizations/org-1/members/member-1',
    body: 'Bonjour',
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="message-edit-dialog"]');

const bodyField = (): HTMLTextAreaElement | null =>
  panel()?.querySelector('[data-testid="message-edit-body"]') ?? null;

const submitButton = (): HTMLButtonElement | null =>
  panel()?.querySelector('[data-testid="message-edit-submit"]') ?? null;

describe('MessageEditDialog', () => {
  let fixture: ComponentFixture<MessageEditDialog>;
  let submitted: string[];

  async function open(target: MessageOutput): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageEditDialog);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((body: string) => submitted.push(body));
    fixture.componentRef.setInput('message', target);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  }

  async function type(value: string): Promise<void> {
    const field = bodyField();
    if (field === null) throw new Error('body field missing');

    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function submit(): void {
    panel()?.querySelector('form')?.dispatchEvent(new Event('submit'));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should prefill the draft from the stored body, mentions made readable', async () => {
    await open(
      message({ body: `Merci &#64;{${MEMBER_ID}}`, mentionNames: { [MEMBER_ID]: 'Ana' } }),
    );

    expect(bodyField()?.value).toBe('Merci @Ana');
  });

  it('should restore mention markers on submit', async () => {
    await open(
      message({ body: `Merci &#64;{${MEMBER_ID}}`, mentionNames: { [MEMBER_ID]: 'Ana' } }),
    );

    await type('Bien vu @Ana');
    submit();
    await fixture.whenStable();

    expect(submitted).toEqual([`Bien vu @{${MEMBER_ID}}`]);
  });

  it('should refuse an empty body', async () => {
    await open(message());

    await type('   ');
    submit();
    await fixture.whenStable();

    expect(submitted).toEqual([]);
  });

  it('should busy-lock the footer while the edit write is in flight', async () => {
    await open(message());
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton()?.disabled).toBe(true);
    expect(submitButton()?.getAttribute('aria-busy')).toBe('true');
  });
});
