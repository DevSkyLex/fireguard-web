import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MessageReactionOutput } from '@features/organization/features/collaboration/models';
import { MessageReactions } from '../message-reactions.component';

/** The popover portals its content into an overlay, not into the host. */
function picker(): HTMLElement | null {
  return document.querySelector('[data-testid="message-reactions-picker"]');
}

describe('MessageReactions', () => {
  let fixture: ComponentFixture<MessageReactions>;
  let toggled: string[];

  function chips(): readonly HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="message-reaction-chip"]',
      ) as NodeListOf<HTMLButtonElement>,
    );
  }

  function openPicker(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('[data-testid="message-reactions-open"]');
  }

  async function render(
    reactions: readonly MessageReactionOutput[],
    canReact: boolean = true,
  ): Promise<void> {
    fixture.componentRef.setInput('reactions', reactions);
    fixture.componentRef.setInput('canReact', canReact);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageReactions);
    toggled = [];
    fixture.componentInstance.toggled.subscribe((emoji: string) => toggled.push(emoji));
    await render([{ emoji: '👍', count: 3, reactedByMe: false }]);
  });

  it('should draw a chip per tally', () => {
    expect(chips()).toHaveLength(1);
    expect(chips()[0].textContent).toContain('👍');
    expect(chips()[0].textContent).toContain('3');
  });

  it('should mark the tallies the reader is part of', async () => {
    expect(chips()[0].getAttribute('aria-pressed')).toBe('false');

    await render([{ emoji: '👍', count: 4, reactedByMe: true }]);

    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('should name a chip in full, since neither the emoji nor the count is a label', () => {
    expect(chips()[0].getAttribute('aria-label')).toContain('3');
    expect(chips()[0].getAttribute('aria-label')).not.toBe('👍');
  });

  it('should report a pressed chip without deciding the direction', () => {
    chips()[0].click();

    // Whether that adds or withdraws is answered by whoever holds the tally.
    expect(toggled).toEqual(['👍']);
  });

  it('should offer a quick pick and report the chosen emoji', async () => {
    expect(picker()).toBeNull();

    openPicker()?.click();
    await fixture.whenStable();

    expect(picker()).not.toBeNull();

    picker()?.querySelector<HTMLButtonElement>('[data-testid="message-reactions-option"]')?.click();
    await fixture.whenStable();

    expect(toggled).toHaveLength(1);
    expect(picker()).toBeNull();
  });

  it('should render nothing at all on an untouched message the reader cannot react to', async () => {
    await render([], false);

    expect(fixture.nativeElement.querySelector('[data-testid="message-reactions"]')).toBeNull();
  });

  it('should show existing tallies read-only without the write permission', async () => {
    await render([{ emoji: '👍', count: 3, reactedByMe: false }], false);

    expect(chips()).toHaveLength(1);
    expect(chips()[0].disabled).toBe(true);
    expect(openPicker()).toBeNull();

    chips()[0].click();

    expect(toggled).toEqual([]);
  });
});
