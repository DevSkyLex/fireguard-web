import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { QuillEditor } from '@features/organization/features/collaboration/models';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { MessageComposer } from '../message-composer.component';

const MEMBERS: readonly MemberDirectoryEntry[] = [
  {
    memberId: 'a1111111-1111-4111-8111-111111111111',
    displayName: 'Ana Costa',
    roleNames: ['Manager'],
    isActive: true,
  },
  {
    memberId: 'b2222222-2222-4222-8222-222222222222',
    displayName: 'Bruno Lima',
    roleNames: [],
    isActive: true,
  },
  {
    memberId: 'c3333333-3333-4333-8333-333333333333',
    displayName: 'Carla Gone',
    roleNames: [],
    isActive: false,
  },
];

/**
 * Minimal view onto the component's protected members, so the composer's logic
 * can be exercised without mounting Quill — it needs a real browser DOM the
 * unit environment does not provide. Same compromise as `CommentComposer`'s
 * spec; the rendered mention list is covered in the browser instead.
 */
interface TestableComposer {
  readonly mentionCandidates: () => readonly MemberDirectoryEntry[];
  readonly activeMention: () => number;
  readonly body: () => string;
  readonly canSend: () => boolean;
  readonly plainLength: () => number;
  readonly overflow: () => number;
  onEditorInit(event: { editor: QuillEditor }): void;
  onTextChange(event: { htmlValue: string | null; textValue: string }): void;
  onSelectionChange(): void;
  acceptMention(member: MemberDirectoryEntry): void;
  openMention(): void;
  discard(): void;
}

/**
 * A Quill stand-in holding a plain-text buffer and a caret, which is the whole
 * contract the composer drives it through.
 */
class FakeQuill implements QuillEditor {
  public readonly root: HTMLElement = document.createElement('div');
  public text = '';
  public caret = 0;

  public getSelection(): { readonly index: number; readonly length: number } {
    return { index: this.caret, length: 0 };
  }

  public getText(index = 0, length: number = Number.MAX_SAFE_INTEGER): string {
    return this.text.slice(index, index + length);
  }

  public setText(value: string): unknown {
    this.text = value;
    this.caret = value.length;

    return null;
  }

  public deleteText(index: number, length: number): unknown {
    this.text = this.text.slice(0, index) + this.text.slice(index + length);

    return null;
  }

  public insertText(index: number, value: string): unknown {
    this.text = this.text.slice(0, index) + value + this.text.slice(index);

    return null;
  }

  public setSelection(index: number): unknown {
    this.caret = index;

    return null;
  }

  public focus(): void {
    /* nothing to focus without a real editor */
  }
}

describe('MessageComposer', () => {
  let fixture: ComponentFixture<MessageComposer>;
  let composer: TestableComposer;
  let quill: FakeQuill;
  let editable: HTMLElement;
  let sent: string[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    // Stub the template so the heavy Quill editor is not mounted.
    TestBed.overrideComponent(MessageComposer, { set: { template: '' } });

    fixture = TestBed.createComponent(MessageComposer);
    fixture.componentRef.setInput('members', MEMBERS);
    fixture.detectChanges();

    composer = fixture.componentInstance as unknown as TestableComposer;
    quill = new FakeQuill();
    composer.onEditorInit({ editor: quill });

    // The composer claims keys in the capture phase on its own host, and only
    // for events coming from the editable area.
    editable = document.createElement('div');
    editable.className = 'ql-editor';
    (fixture.nativeElement as HTMLElement).append(editable);

    sent = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));
  });

  function type(text: string, html: string = `<p>${text}</p>`): void {
    quill.text = text;
    quill.caret = text.length;
    composer.onTextChange({ htmlValue: html, textValue: text });
    fixture.detectChanges();
  }

  function press(key: string, init: KeyboardEventInit = {}): void {
    // `cancelable` matters: `preventDefault()` is a no-op without it, and
    // taking Enter back from the editor is the whole mechanism under test.
    editable.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should send the editor HTML on Enter and clear itself', () => {
    type('Extincteur remplacé.', '<p><strong>Extincteur</strong> remplacé.</p>');
    press('Enter');

    expect(sent).toEqual(['<p><strong>Extincteur</strong> remplacé.</p>']);
    expect(composer.plainLength()).toBe(0);
    expect(quill.text).toBe('');
  });

  it('should leave Shift+Enter to the editor', () => {
    type('first line');
    press('Enter', { shiftKey: true });

    expect(sent).toEqual([]);
  });

  it('should refuse to send the editor blank output', () => {
    // Quill reports an empty document as a paragraph holding a line break.
    composer.onTextChange({ htmlValue: '<p><br></p>', textValue: '\n' });
    fixture.detectChanges();

    expect(composer.canSend()).toBe(false);
    press('Enter');
    expect(sent).toEqual([]);
  });

  it('should refuse to send once the markup passes the ceiling', () => {
    // The editable has no `maxlength`, and the markup is several times the
    // length of the text, so this is the only guard there is.
    type('x'.repeat(300), `<p>${'x'.repeat(4100)}</p>`);

    expect(composer.overflow()).toBeGreaterThan(0);
    press('Enter');

    expect(sent).toEqual([]);
  });

  it('should discard without sending', () => {
    type('never mind');
    composer.discard();

    expect(sent).toEqual([]);
    expect(quill.text).toBe('');
  });

  describe('mentions', () => {
    it('should offer active members once an @ is typed', () => {
      type('ping @');

      // Carla is inactive: mentioning someone who has left notifies nobody.
      expect(composer.mentionCandidates().map((m) => m.displayName)).toEqual([
        'Ana Costa',
        'Bruno Lima',
      ]);
    });

    it('should filter on what follows the @', () => {
      type('ping @bru');

      expect(composer.mentionCandidates().map((m) => m.displayName)).toEqual(['Bruno Lima']);
    });

    it('should move the highlight with the arrow keys', () => {
      type('@');
      expect(composer.activeMention()).toBe(0);

      press('ArrowDown');
      expect(composer.activeMention()).toBe(1);

      press('ArrowDown');
      expect(composer.activeMention()).toBe(0);
    });

    it('should insert the name on Enter and post the marker', () => {
      type('ping @ana');
      press('Enter');

      // Enter accepted the suggestion; it did not send.
      expect(sent).toEqual([]);
      expect(quill.text).toBe('ping @Ana Costa ');

      // And the list closed on itself rather than re-opening on the label.
      composer.onSelectionChange();
      fixture.detectChanges();
      expect(composer.mentionCandidates()).toEqual([]);

      type('ping @Ana Costa ', '<p>ping @Ana Costa</p>');
      press('Enter');

      expect(sent).toEqual([`<p>ping @{${MEMBERS[0].memberId}}</p>`]);
    });

    it('should close on Escape and leave Enter free to send', () => {
      type('ping @ana');
      press('Escape');

      expect(composer.mentionCandidates()).toEqual([]);

      press('Enter');

      expect(sent).toEqual(['<p>ping @ana</p>']);
    });

    it('should not offer anyone when the caller has no directory', () => {
      fixture.componentRef.setInput('members', []);
      fixture.detectChanges();

      type('@');

      expect(composer.mentionCandidates()).toEqual([]);
    });

    it('should open the picker from the toolbar, separating it from the word before', () => {
      type('hello');
      composer.openMention();

      expect(quill.text).toBe('hello @');
    });

    it('should ignore keys typed outside the editable area', () => {
      type('ping @');
      // The emoji palette and the toolbar live under the same host.
      (fixture.nativeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      fixture.detectChanges();

      expect(sent).toEqual([]);
      expect(composer.mentionCandidates().length).toBeGreaterThan(0);
    });
  });
});
