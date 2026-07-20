import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessageComposer } from '../message-composer.component';

function at(fixture: ComponentFixture<MessageComposer>, testId: string): HTMLElement | null {
  return (
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement as
      | HTMLElement
      | undefined) ?? null
  );
}

/**
 * The composer is presentational: it owns the draft only through its two-way
 * model, and every consequence leaves through an output. These specs pin that
 * contract, plus the toolbar the design kit prescribes.
 */
describe('MessageComposer', () => {
  let fixture: ComponentFixture<MessageComposer>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MessageComposer] });
    fixture = TestBed.createComponent(MessageComposer);
    fixture.componentRef.setInput('draft', '');
    fixture.detectChanges();
  });

  it('ships the five toolbar actions of the design kit', () => {
    for (const action of ['assistant', 'mention', 'shortcuts', 'emoji']) {
      expect(at(fixture, `message-composer-${action}`)).not.toBeNull();
    }
    // The attachment trigger is a label wrapping a hidden input, not a button.
    expect(at(fixture, 'message-composer-file-input')).not.toBeNull();
  });

  it('drops the thread-only actions in the compact reply variant', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(at(fixture, 'message-composer-assistant')).toBeNull();
    expect(at(fixture, 'message-composer-shortcuts')).toBeNull();
    // Mention and emoji still make sense on a reply.
    expect(at(fixture, 'message-composer-mention')).not.toBeNull();
    expect(at(fixture, 'message-composer-emoji')).not.toBeNull();
  });

  it('keeps Send disabled until there is text or an attachment', () => {
    const send = (): HTMLButtonElement =>
      fixture.debugElement.query(By.css('[data-testid="message-send"] button'))
        .nativeElement as HTMLButtonElement;

    expect(send().disabled).toBe(true);

    fixture.componentRef.setInput('draft', 'hello');
    fixture.detectChanges();

    expect(send().disabled).toBe(false);
  });

  it('offers Discard only once something would be lost', () => {
    expect(at(fixture, 'message-composer-discard')).toBeNull();

    fixture.componentRef.setInput('draft', 'half a thought');
    fixture.detectChanges();

    expect(at(fixture, 'message-composer-discard')).not.toBeNull();
  });

  it('clears the draft and reports the discard', () => {
    const discarded = vi.fn();
    fixture.componentInstance.discarded.subscribe(discarded);
    fixture.componentRef.setInput('draft', 'half a thought');
    fixture.detectChanges();

    at(fixture, 'message-composer-discard')?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe('');
    expect(discarded).toHaveBeenCalledTimes(1);
  });

  it('appends the chosen emoji to the draft and closes the grid', () => {
    fixture.componentRef.setInput('draft', 'ship it');
    fixture.detectChanges();

    at(fixture, 'message-composer-emoji')?.querySelector('button')?.click();
    fixture.detectChanges();

    const grid = at(fixture, 'message-composer-emoji-picker');
    expect(grid).not.toBeNull();

    (grid?.querySelector('button') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe('ship it👍');
    expect(at(fixture, 'message-composer-emoji-picker')).toBeNull();
  });

  it('does not send an empty draft on Enter', () => {
    const sent = vi.fn();
    fixture.componentInstance.sent.subscribe(sent);

    const textarea = fixture.debugElement.query(By.css('[data-testid="message-composer"]'));
    textarea.triggerEventHandler('keydown', new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(sent).not.toHaveBeenCalled();
  });

  describe('mentions', () => {
    const ALICE_ID = '11111111-1111-4111-8111-111111111111';
    const MEMBERS = [
      { id: ALICE_ID, displayName: 'Alice Martin', initials: 'AM', avatarUrl: null },
      {
        id: '22222222-2222-4222-8222-222222222222',
        displayName: 'Bob Durand',
        initials: 'BD',
        avatarUrl: null,
      },
    ];

    /** Types into the real textarea so the caret the component reads is real. */
    function type(text: string): void {
      const field = fixture.debugElement.query(By.css('[data-testid="message-composer"]'))
        .nativeElement as HTMLTextAreaElement;
      fixture.componentRef.setInput('draft', text);
      fixture.detectChanges();
      field.value = text;
      field.setSelectionRange(text.length, text.length);
      field.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    beforeEach(() => {
      fixture.componentRef.setInput('members', MEMBERS);
      fixture.detectChanges();
    });

    it('opens on an @ at a word boundary and filters by name', () => {
      type('hey @ali');

      expect(at(fixture, 'message-composer-mention-popover')).not.toBeNull();
      expect(at(fixture, 'message-composer-mention-option-0')?.textContent).toContain(
        'Alice Martin',
      );
      expect(at(fixture, 'message-composer-mention-option-1')).toBeNull();
    });

    it('stays shut for an @ glued to a word, which is an e-mail not a mention', () => {
      type('write to alice@acme');

      expect(at(fixture, 'message-composer-mention-popover')).toBeNull();
    });

    it('says so when nothing matches instead of going silent', () => {
      type('hey @zzz');

      expect(at(fixture, 'message-composer-mention-empty')).not.toBeNull();
    });

    it('inserts the backend token so the member is actually notified', () => {
      type('hey @ali');
      at(fixture, 'message-composer-mention-option-0')?.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.draft()).toBe(`hey @{${ALICE_ID}} `);
      expect(at(fixture, 'message-composer-mention-popover')).toBeNull();
    });

    it('completes the mention on Enter rather than posting a half-typed name', () => {
      const sent = vi.fn();
      fixture.componentInstance.sent.subscribe(sent);
      type('hey @ali');

      const field = fixture.debugElement.query(By.css('[data-testid="message-composer"]'));
      field.triggerEventHandler('keydown', new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(sent).not.toHaveBeenCalled();
      expect(fixture.componentInstance.draft()).toContain(`@{${ALICE_ID}}`);
    });

    it('closes on Escape and leaves the draft alone', () => {
      type('hey @ali');

      const field = fixture.debugElement.query(By.css('[data-testid="message-composer"]'));
      field.triggerEventHandler('keydown', new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(at(fixture, 'message-composer-mention-popover')).toBeNull();
      expect(fixture.componentInstance.draft()).toBe('hey @ali');
    });
  });

  it('sends on Enter and leaves Shift+Enter to break the line', () => {
    const sent = vi.fn();
    fixture.componentInstance.sent.subscribe(sent);
    fixture.componentRef.setInput('draft', 'hello');
    fixture.detectChanges();

    const textarea = fixture.debugElement.query(By.css('[data-testid="message-composer"]'));

    textarea.triggerEventHandler(
      'keydown',
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }),
    );
    expect(sent).not.toHaveBeenCalled();

    textarea.triggerEventHandler('keydown', new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toHaveBeenCalledTimes(1);
  });
});
