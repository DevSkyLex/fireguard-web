import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MessageView } from '@features/organization/features/collaboration/models';
import { MessageRow } from '../message-row.component';

function view(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: 'message-1',
    authorId: 'member-1',
    authorName: 'Amélie Rousseau',
    bodyHtml: '<p>Extincteur 3 non conforme.</p>',
    createdAt: '2026-01-01T09:00:00+00:00',
    isDeleted: false,
    isOwn: false,
    status: 'sent',
    isPinned: false,
    isSaved: false,
    replyCount: 0,
    canEdit: false,
    canDelete: false,
    reactions: [],
    ...overrides,
  };
}

describe('MessageRow', () => {
  let fixture: ComponentFixture<MessageRow>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function render(message: MessageView, continuation: boolean = false): Promise<void> {
    fixture.componentRef.setInput('message', message);
    fixture.componentRef.setInput('continuation', continuation);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageRow);
    await render(view());
  });

  it('should render the body as HTML', () => {
    expect(fixture.nativeElement.querySelector('p')?.textContent).toBe(
      'Extincteur 3 non conforme.',
    );
  });

  it('should name the author when a run starts', () => {
    expect(text()).toContain('Amélie Rousseau');
  });

  it('should drop the name and the avatar on a continuation', async () => {
    await render(view(), true);

    // A run of messages by one person is one voice, not three headers.
    expect(text()).not.toContain('Amélie Rousseau');
    expect(fixture.nativeElement.querySelector('hlm-avatar')).toBeNull();
  });

  it('should replace a tombstoned body with a placeholder', async () => {
    await render(view({ isDeleted: true, bodyHtml: '' }));

    expect(text()).toContain('This message was deleted');
  });

  it('should offer to retry a message that never left', async () => {
    const retried: string[] = [];
    fixture.componentInstance.retried.subscribe((id: string) => retried.push(id));

    await render(view({ status: 'failed' }));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="message-row-retry"]')
      ?.click();
    await fixture.whenStable();

    expect(text()).toContain('Not sent');
    expect(retried).toEqual(['message-1']);
  });

  it('should say a message is still on its way', async () => {
    await render(view({ status: 'pending' }));

    expect(text()).toContain('Sending');
    expect(fixture.nativeElement.querySelector('[data-testid="message-row-retry"]')).toBeNull();
  });

  it('should mark an edited message', async () => {
    await render(view({ editedAt: '2026-01-01T10:00:00+00:00' }));

    expect(text()).toContain('Edited');
  });

  it('should mark a pinned message', async () => {
    await render(view({ isPinned: true }));

    expect(text()).toContain('Pinned');
  });

  it('should hide the actions trigger unless a surface enables it', async () => {
    await render(view());

    expect(fixture.nativeElement.querySelector('[data-testid="message-row-actions"]')).toBeNull();
  });

  it('should show the actions trigger once enabled, on sent messages only', async () => {
    fixture.componentRef.setInput('actionsEnabled', true);
    await render(view());
    expect(
      fixture.nativeElement.querySelector('[data-testid="message-row-actions"]'),
    ).not.toBeNull();

    // An optimistic row has no server id anything could act on.
    await render(view({ status: 'pending' }));
    expect(fixture.nativeElement.querySelector('[data-testid="message-row-actions"]')).toBeNull();
  });

  it('should hide the trigger when no item survives the permission gates', async () => {
    fixture.componentRef.setInput('actionsEnabled', true);
    await render(view({ isDeleted: true, bodyHtml: '', replyCount: 0 }));

    // A tombstone without replies offers nothing a reader may do.
    expect(fixture.nativeElement.querySelector('[data-testid="message-row-actions"]')).toBeNull();
  });

  it('should keep the thread reachable on a tombstone that has replies', async () => {
    fixture.componentRef.setInput('actionsEnabled', true);
    await render(view({ isDeleted: true, bodyHtml: '', replyCount: 2 }));

    expect(
      fixture.nativeElement.querySelector('[data-testid="message-row-actions"]'),
    ).not.toBeNull();
  });

  it('should surface the reply count and open the thread from it', async () => {
    const requested: string[] = [];
    fixture.componentInstance.threadRequested.subscribe((id: string) => requested.push(id));

    fixture.componentRef.setInput('actionsEnabled', true);
    await render(view({ replyCount: 2 }));

    const counter = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="message-row-replies"]',
    );

    expect(counter?.textContent).toContain('2 replies');
    counter?.click();
    await fixture.whenStable();

    expect(requested).toEqual(['message-1']);
  });
});
