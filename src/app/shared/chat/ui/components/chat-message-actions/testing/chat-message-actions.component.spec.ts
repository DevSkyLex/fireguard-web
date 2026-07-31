import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ChatMessageActions } from '../chat-message-actions.component';

interface Capabilities {
  readonly canReact?: boolean;
  readonly canSave?: boolean;
  readonly canPin?: boolean;
  readonly canReply?: boolean;
  readonly canCopy?: boolean;
  readonly canMarkRead?: boolean;
  readonly canDelete?: boolean;
  readonly isPinned?: boolean;
}

let fixture: ComponentFixture<ChatMessageActions>;

function setup(capabilities: Capabilities = {}): ChatMessageActions {
  TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });

  fixture = TestBed.createComponent(ChatMessageActions);
  fixture.componentRef.setInput('quickReactions', ['👍']);

  for (const [name, value] of Object.entries(capabilities)) {
    fixture.componentRef.setInput(name, value);
  }

  fixture.detectChanges();

  return fixture.componentInstance;
}

/** Opens the overflow menu and returns what it offers, in order. */
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

describe('ChatMessageActions', () => {
  it('keeps only the one-tap controls on the bar', () => {
    setup({ canDelete: true });

    const bar: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="chat-message-actions"]',
    );

    // The quick reaction, the bookmark and the overflow trigger — and nothing
    // else. Pinning used to sit here and now lives in the menu.
    expect(bar.querySelectorAll('button')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[data-testid="chat-message-more"]')).not.toBeNull();
  });

  it('offers reply, copy, mark as read, pin and delete behind the trigger', () => {
    setup({ canMarkRead: true, canDelete: true });

    expect(openMenu()).toEqual([
      'Reply',
      'Copy message',
      'Mark as read',
      'Pin message',
      'Delete message',
    ]);
  });

  it('names the pin entry after what it will do', () => {
    setup({ isPinned: true, canReply: false, canCopy: false });

    expect(openMenu()).toEqual(['Unpin message']);
  });

  it('leaves out what the surface turned off', () => {
    setup({ canPin: false, canCopy: false });

    expect(openMenu()).toEqual(['Reply']);
  });

  it('emits the action the reader picked', () => {
    const component = setup({ canMarkRead: true, canDelete: true });
    const replied = vi.spyOn(component.replied, 'emit');
    const deleted = vi.spyOn(component.deleted, 'emit');
    const pinToggled = vi.spyOn(component.pinToggled, 'emit');

    openMenu();
    document
      .querySelectorAll('.p-menu-item-link')
      .forEach((item: Element): void => (item as HTMLElement).click());

    expect(replied).toHaveBeenCalled();
    expect(deleted).toHaveBeenCalled();
    expect(pinToggled).toHaveBeenCalled();
  });

  it('draws no trigger when the menu would open empty', () => {
    setup({ canPin: false, canReply: false, canCopy: false });

    expect(fixture.nativeElement.querySelector('[data-testid="chat-message-more"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="chat-message-actions"]'),
    ).not.toBeNull();
  });

  it('draws no bar at all when every capability is off', () => {
    // A reply thread's own root message renders exactly like this, and an empty
    // bar is still a bordered pill.
    setup({
      canReact: false,
      canSave: false,
      canPin: false,
      canReply: false,
      canCopy: false,
    });

    expect(fixture.nativeElement.querySelector('[data-testid="chat-message-actions"]')).toBeNull();
  });
});
