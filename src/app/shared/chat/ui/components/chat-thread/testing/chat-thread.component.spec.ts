import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { ChatMessageItem } from '../../../../models';
import { ChatMessageExtraDirective } from '../../../directives/chat-message-extra';
import { ChatThread } from '../chat-thread.component';

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

let fixture: ComponentFixture<ChatThread>;

function render(inputs: Record<string, unknown> = {}): ComponentFixture<ChatThread> {
  TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });

  fixture = TestBed.createComponent(ChatThread);
  fixture.componentRef.setInput('label', 'Conversation');

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture;
}

function query(testId: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}

describe('ChatThread', () => {
  it('breaks the history with a rule whenever the day changes', () => {
    render({
      messages: [
        item({ id: 'm1', createdAt: '2026-07-20T09:00:00+00:00' }),
        item({ id: 'm2', createdAt: '2026-07-20T09:02:00+00:00' }),
        item({ id: 'm3', createdAt: '2026-07-21T09:00:00+00:00' }),
      ],
    });

    // Three messages, two calendar days — the third message opens a new day.
    expect(fixture.nativeElement.querySelectorAll('[data-testid="chat-thread-day"]')).toHaveLength(
      2,
    );
    expect(fixture.nativeElement.querySelectorAll('app-chat-message')).toHaveLength(3);
  });

  it('draws placeholders while the first page is in flight', () => {
    render({ loading: true, loadingLabel: 'Loading messages' });

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('offers the empty placeholder once the read has settled on nothing', () => {
    render({ emptyTitle: 'No messages yet' });

    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('shows how far the history is loaded, and asks for more', () => {
    render({ hasMore: true, loadedCount: 20, totalCount: 57, loadMoreLabel: 'Load earlier' });
    const loadMore = vi.spyOn(fixture.componentInstance.loadMore, 'emit');

    const control = query('chat-thread-load-more');
    expect(control?.textContent).toContain('Load earlier (20/57)');

    control?.click();
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('hides the load control when the history is complete', () => {
    render({ messages: [item()], loadedCount: 1, totalCount: 1 });

    expect(query('chat-thread-load-more')).toBeNull();
  });

  it('surfaces a failure the consumer has already worded', () => {
    // A string, not an error object: the shared concept owns no error model.
    render({ errorMessage: 'Could not load the conversation.' });

    expect(query('chat-thread-error')?.textContent).toContain('Could not load the conversation.');
  });

  it('names the log region and marks it busy while reading', () => {
    render({ loading: true });

    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('role')).toBe('log');
    expect(host.getAttribute('aria-label')).toBe('Conversation');
    expect(host.getAttribute('aria-busy')).toBe('true');
  });

  it('reports which message an action was taken on', () => {
    // Rows emit their own event; the thread is what turns it into an id the
    // consumer can act on, since a row does not own the conversation.
    render({ messages: [item({ id: 'm1' }), item({ id: 'm2', authorId: 'other' })] });
    const saveToggled = vi.spyOn(fixture.componentInstance.saveToggled, 'emit');

    const rows = fixture.debugElement.queryAll((node): boolean => node.name === 'app-chat-message');
    rows[1]?.triggerEventHandler('saveToggled');

    expect(saveToggled).toHaveBeenCalledWith('m2');
  });
});

@Component({
  template: `
    <app-chat-thread [messages]="messages" label="Conversation">
      <ng-template appChatMessageExtra let-message>
        <span data-testid="extra">extra for {{ message.id }}</span>
      </ng-template>
    </app-chat-thread>
  `,
  imports: [ChatThread, ChatMessageExtraDirective],
})
class HostComponent {
  public readonly messages: readonly ChatMessageItem[] = [item({ id: 'm1' })];
}

describe('ChatThread projection', () => {
  it('hands the consumer template down to every row', () => {
    // `contentChild` does not reach across a component boundary, so the thread
    // has to forward the TemplateRef explicitly — this is what proves the hop.
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });

    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();

    expect(host.nativeElement.querySelector('[data-testid="extra"]')?.textContent).toContain(
      'extra for m1',
    );
  });
});
