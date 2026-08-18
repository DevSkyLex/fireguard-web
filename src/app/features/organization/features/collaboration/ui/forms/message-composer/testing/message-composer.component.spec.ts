import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { MESSAGE_BODY_MAX_LENGTH } from '../constants';
import { MessageComposer } from '../message-composer.component';

const MEMBERS: readonly MemberDirectoryEntry[] = [
  { memberId: 'member-9', displayName: 'Amélie Rousseau', roleNames: [], isActive: true },
  { memberId: 'member-8', displayName: 'Bruno Lefèvre', roleNames: [], isActive: true },
];

describe('MessageComposer', () => {
  let fixture: ComponentFixture<MessageComposer>;
  let sent: string[];

  function textarea(): HTMLTextAreaElement | null {
    return fixture.nativeElement.querySelector('[data-testid="message-composer-input"]');
  }

  function sendButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('[data-testid="message-composer-send"]');
  }

  function counter(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="message-composer-counter"]');
  }

  /** Types into the field the way a member would, so the field tree updates. */
  async function type(text: string): Promise<void> {
    const field: HTMLTextAreaElement | null = textarea();

    if (field === null) throw new Error('The composer has no field.');

    field.value = text;
    // The mention list is a function of the caret as much as of the text.
    field.setSelectionRange(text.length, text.length);
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function mentions(): readonly HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="message-composer-mention"]',
      ) as NodeListOf<HTMLButtonElement>,
    );
  }

  async function press(key: string): Promise<void> {
    textarea()?.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(MessageComposer);
    sent = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));
    fixture.componentRef.setInput('members', MEMBERS);
    await fixture.whenStable();
  });

  it('should refuse to send an empty message', () => {
    expect(sendButton()?.disabled).toBe(true);
  });

  it('should refuse to send whitespace', async () => {
    await type('   ');

    expect(sendButton()?.disabled).toBe(true);
  });

  it('should emit the trimmed body and clear itself', async () => {
    await type('  Bien reçu.  ');
    sendButton()?.click();
    await fixture.whenStable();

    expect(sent).toEqual(['Bien reçu.']);
    expect(textarea()?.value).toBe(''); // The send is optimistic, so nothing waits on the server.
  });

  it('should refuse a body past the length the domain accepts', async () => {
    await type('x'.repeat(MESSAGE_BODY_MAX_LENGTH + 1));
    sendButton()?.click();
    await fixture.whenStable();

    // The DTO advertises 40000; the handler refuses anything over 4000.
    expect(sent).toEqual([]);
    expect(fixture.nativeElement.querySelector('hlm-field-error')).not.toBeNull();
  });

  it('should keep the counter out of the way until the cap is in sight', async () => {
    await type('Bien reçu.');

    // Almost every message is two lines; a permanent counter is noise.
    expect(counter()).toBeNull();
  });

  it('should count down the last characters before the cap', async () => {
    await type('x'.repeat(MESSAGE_BODY_MAX_LENGTH - 10));

    expect(counter()?.textContent?.trim()).toBe('10');
  });

  it('should show how far past the cap an over-long message is', async () => {
    await type('x'.repeat(MESSAGE_BODY_MAX_LENGTH + 3));

    expect(counter()?.textContent?.trim()).toBe('-3');
    expect(counter()?.classList.contains('text-destructive')).toBe(true);
  });

  it('should not send while a message is already on its way', async () => {
    await type('Bien reçu.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(sendButton()?.disabled).toBe(true);
  });

  it('should explain a read-only conversation instead of disabling the field', async () => {
    fixture.componentRef.setInput('readOnly', true);
    await fixture.whenStable();

    // A disabled textarea with no explanation reads as a bug.
    expect(textarea()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="message-composer-read-only"]'),
    ).not.toBeNull();
  });

  it('should start a line on Shift+Enter rather than sending', async () => {
    await type('Bien reçu.');
    textarea()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    await fixture.whenStable();

    expect(sent).toEqual([]);
  });

  it('should send on Enter', async () => {
    await type('Bien reçu.');
    await press('Enter');

    expect(sent).toEqual(['Bien reçu.']);
  });

  describe('draftChanged', () => {
    it('should report the draft dirty once something is written', async () => {
      const dirty: boolean[] = [];
      fixture.componentInstance.draftChanged.subscribe((value: boolean) => dirty.push(value));

      await type('Bien reçu.');

      expect(dirty).toContain(true);
    });

    it('should not consider whitespace alone a dirty draft', async () => {
      const dirty: boolean[] = [];
      fixture.componentInstance.draftChanged.subscribe((value: boolean) => dirty.push(value));

      await type('   ');

      expect(dirty).not.toContain(true);
    });

    it('should report the draft clean again once emptied', async () => {
      await type('Bien reçu.');
      const dirty: boolean[] = [];
      fixture.componentInstance.draftChanged.subscribe((value: boolean) => dirty.push(value));

      await type('');

      expect(dirty).toContain(false);
    });

    it('should report the draft clean once it is sent', async () => {
      await type('Bien reçu.');
      const dirty: boolean[] = [];
      fixture.componentInstance.draftChanged.subscribe((value: boolean) => dirty.push(value));

      // The composer clears its own model synchronously; `pending` settles later.
      sendButton()?.click();
      await fixture.whenStable();

      expect(dirty).toEqual([false]);
    });
  });

  describe('autoFocus', () => {
    it('should not take focus by default', () => {
      expect(document.activeElement).not.toBe(textarea());
    });

    it('should focus the field once it is editable and autoFocus is set', async () => {
      fixture.componentRef.setInput('autoFocus', true);
      await fixture.whenStable();

      expect(document.activeElement).toBe(textarea());
    });

    it('should not focus a read-only field even with autoFocus set', async () => {
      fixture.componentRef.setInput('readOnly', true);
      fixture.componentRef.setInput('autoFocus', true);
      await fixture.whenStable();

      expect(document.activeElement?.tagName).not.toBe('TEXTAREA');
    });
  });

  describe('pending', () => {
    it('should not mark the send control busy while idle', () => {
      expect(sendButton()?.getAttribute('aria-busy')).toBeNull();
      expect(fixture.nativeElement.querySelector('hlm-spinner')).toBeNull();
    });

    it('should swap the send icon for a spinner and mark the control busy while pending', async () => {
      await type('Bien reçu.');
      fixture.componentRef.setInput('pending', true);
      await fixture.whenStable();

      expect(sendButton()?.getAttribute('aria-busy')).toBe('true');
      expect(sendButton()?.querySelector('hlm-spinner')).not.toBeNull();
      // The arrow icon is a direct child of the button; the spinner's own icon sits inside `hlm-spinner`.
      expect(sendButton()?.querySelector(':scope > ng-icon')).toBeNull();
    });
  });

  describe('mentions', () => {
    it('should stay closed until an @ opens a term', async () => {
      await type('Bien reçu');

      expect(mentions()).toHaveLength(0);
    });

    it('should offer everyone on a bare @', async () => {
      await type('@');

      expect(mentions()).toHaveLength(2);
    });

    it('should narrow the list as the term is typed', async () => {
      await type('@bru');

      expect(mentions()).toHaveLength(1);
      expect(mentions()[0].textContent).toContain('Bruno Lefèvre');
    });

    it('should not read an email address as a mention', async () => {
      await type('write to bruno@fireguard');

      // The @ has to start a word, or every address opens a picker.
      expect(mentions()).toHaveLength(0);
    });

    it('should insert the name and close the list when one is picked', async () => {
      await type('@bru');
      mentions()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await fixture.whenStable();

      expect(textarea()?.value).toBe('@Bruno Lefèvre ');
      expect(mentions()).toHaveLength(0);
    });

    it('should take Enter for the highlighted suggestion rather than sending', async () => {
      await type('@bru');
      await press('Enter');

      // Sending here would post a half-typed name.
      expect(sent).toEqual([]);
      expect(textarea()?.value).toBe('@Bruno Lefèvre ');
    });

    it('should move the highlight with the arrows', async () => {
      await type('@');
      await press('ArrowDown');
      await press('Enter');

      expect(textarea()?.value).toBe('@Bruno Lefèvre ');
    });

    it('should dismiss on Escape without touching the draft', async () => {
      await type('@bru');
      await press('Escape');

      expect(mentions()).toHaveLength(0);
      expect(textarea()?.value).toBe('@bru');
    });

    it('should send the member id as a marker, not the name', async () => {
      await type('@bru');
      await press('Enter');
      await press('Enter');

      // The draft stays readable; the API only ever parses `@{uuid}`.
      expect(sent).toEqual(['@{member-8}']);
    });

    it('should drop a mention the author retyped over', async () => {
      await type('@bru');
      await press('Enter');
      await type('Bien reçu.');
      await press('Enter');

      expect(sent).toEqual(['Bien reçu.']);
    });

    it('should offer nobody when the directory could not be read', async () => {
      fixture.componentRef.setInput('members', []);
      await type('@bru');

      expect(mentions()).toHaveLength(0);
    });
  });
});
