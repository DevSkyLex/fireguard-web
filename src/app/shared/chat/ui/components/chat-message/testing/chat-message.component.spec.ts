import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { ChatMessageItem } from '../../../../models';
import { ChatMessage } from '../chat-message.component';

function item(overrides: Partial<ChatMessageItem> = {}): ChatMessageItem {
  return {
    id: 'm1',
    authorId: '/api/organizations/org-1/members/member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Extincteur 3 non conforme.</p>',
    createdAt: '2026-07-20T09:00:00+00:00',
    isDeleted: false,
    isSaved: false,
    isPinned: false,
    canDelete: false,
    replyCount: 0,
    status: 'sent',
    reactions: [],
    attachments: [],
    ...overrides,
  };
}

let fixture: ComponentFixture<ChatMessage>;

function render(
  message: ChatMessageItem,
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatMessage> {
  TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });

  fixture = TestBed.createComponent(ChatMessage);
  fixture.componentRef.setInput('message', message);

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

/** Opens the overflow menu and returns what it offers. */
function openMenu(): string[] {
  const trigger: HTMLButtonElement | null = fixture.nativeElement.querySelector(
    '[data-testid="chat-message-more"] button',
  );

  trigger?.click();
  fixture.detectChanges();

  return [...document.querySelectorAll('.p-menu-item-label')].map(
    (label: Element): string => label.textContent?.trim() ?? '',
  );
}

describe('ChatMessage', () => {
  it('offers deletion only when the reader may and the surface can', () => {
    render(item({ canDelete: true }));
    expect(openMenu()).toContain('Delete message');
  });

  it('lets the surface veto deletion the message itself permits', () => {
    // The reply panel's root message is exactly this: deletable in principle,
    // but the panel has nowhere to send the event, so the entry would be dead.
    render(item({ canDelete: true }), { canDelete: false });
    expect(openMenu()).not.toContain('Delete message');
  });

  it('never grants deletion the message withholds', () => {
    render(item({ canDelete: false }), { canDelete: true });
    expect(openMenu()).not.toContain('Delete message');
  });

  it('shows the reply count when a message has replies', () => {
    render(item({ replyCount: 3 }));

    expect(
      fixture.nativeElement.querySelector('[data-testid="chat-message-replies"]')?.textContent,
    ).toContain('3');
  });

  it('hides the reply count where replying is not offered', () => {
    // A count that opens nothing is a dead link.
    render(item({ replyCount: 3 }), { canReply: false });

    expect(fixture.nativeElement.querySelector('[data-testid="chat-message-replies"]')).toBeNull();
  });

  it('draws no action bar on a deleted message', () => {
    render(item({ isDeleted: true, canDelete: true }));

    expect(fixture.nativeElement.querySelector('[data-testid="chat-message-actions"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('This message was deleted.');
  });

  it('emits the body as plain text when copying', () => {
    const copied = vi.spyOn(render(item()).componentInstance.copied, 'emit');

    openMenu();
    [...document.querySelectorAll('.p-menu-item-link')]
      .filter((link: Element): boolean => link.textContent?.includes('Copy') === true)
      .forEach((link: Element): void => (link as HTMLElement).click());

    // The markup stops here: the consumer receives text it can put on a
    // clipboard without knowing how the body was rendered.
    expect(copied).toHaveBeenCalledWith('Extincteur 3 non conforme.');
  });
});
