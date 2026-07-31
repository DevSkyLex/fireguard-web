import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ChatReaction } from '../../../../models';
import { ChatReactionList } from '../chat-reaction-list.component';

let fixture: ComponentFixture<ChatReactionList>;

function render(
  reactions: readonly ChatReaction[],
  interactive = true,
): ComponentFixture<ChatReactionList> {
  fixture = TestBed.createComponent(ChatReactionList);

  fixture.componentRef.setInput('reactions', reactions);
  fixture.componentRef.setInput('interactive', interactive);
  fixture.detectChanges();

  return fixture;
}

function chips(): HTMLButtonElement[] {
  return [...fixture.nativeElement.querySelectorAll('button')];
}

describe('ChatReactionList', () => {
  it('draws nothing when a message has no reaction', () => {
    expect(render([]).nativeElement.querySelector('ul')).toBeNull();
  });

  it('shows each emoji with its tally', () => {
    render([
      { emoji: '👍', count: 3, reactedByMe: false },
      { emoji: '🎉', count: 1, reactedByMe: true },
    ]);

    expect(chips()).toHaveLength(2);
    expect(chips()[0]?.textContent).toContain('👍');
    expect(chips()[0]?.textContent).toContain('3');
  });

  it('adds a reaction the reader is not yet counted in', () => {
    render([{ emoji: '👍', count: 3, reactedByMe: false }]);
    const reacted = vi.spyOn(fixture.componentInstance.reacted, 'emit');

    chips()[0]?.click();

    expect(reacted).toHaveBeenCalledWith('👍');
  });

  it('takes back a reaction the reader is already counted in', () => {
    // Same control, opposite meaning — the tally is a toggle, and which way it
    // goes is read off the reaction, not off a separate button.
    render([{ emoji: '👍', count: 3, reactedByMe: true }]);
    const removed = vi.spyOn(fixture.componentInstance.reactionRemoved, 'emit');

    chips()[0]?.click();

    expect(removed).toHaveBeenCalledWith('👍');
  });

  it('marks the pressed state only where pressing does something', () => {
    render([{ emoji: '👍', count: 3, reactedByMe: true }]);
    expect(chips()[0]?.getAttribute('aria-pressed')).toBe('true');

    // A read-only surface keeps the chips readable but must not announce a
    // toggle it would ignore.
    render([{ emoji: '👍', count: 3, reactedByMe: true }], false);
    expect(chips()[0]?.disabled).toBe(true);
    expect(chips()[0]?.getAttribute('aria-pressed')).toBeNull();
  });

  it('emits nothing when it is not interactive', () => {
    render([{ emoji: '👍', count: 3, reactedByMe: false }], false);
    const reacted = vi.spyOn(fixture.componentInstance.reacted, 'emit');

    chips()[0]?.click();

    expect(reacted).not.toHaveBeenCalled();
  });
});
