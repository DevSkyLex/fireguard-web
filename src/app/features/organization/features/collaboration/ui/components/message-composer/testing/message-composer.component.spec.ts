import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessageComposer } from '../message-composer.component';

describe('MessageComposer', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [MessageComposer] });

    const fixture = TestBed.createComponent(MessageComposer);
    fixture.detectChanges();

    return fixture;
  }

  function type(fixture: ReturnType<typeof createFixture>, value: string): HTMLTextAreaElement {
    const textarea = fixture.debugElement.query(By.css('textarea'))
      .nativeElement as HTMLTextAreaElement;

    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    return textarea;
  }

  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('should send on Enter', () => {
    const fixture = createFixture();
    const sent: string[] = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));

    const textarea = type(fixture, '  Extincteur remplacé.  ');
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    // Trimmed, and the composer clears itself.
    expect(sent).toEqual(['Extincteur remplacé.']);
    expect(textarea.value).toBe('');
  });

  it('should insert a line break on Shift+Enter instead of sending', () => {
    const fixture = createFixture();
    const sent: string[] = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));

    const textarea = type(fixture, 'first line');
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    fixture.detectChanges();

    expect(sent).toEqual([]);
  });

  it('should refuse to send a blank draft', () => {
    const fixture = createFixture();
    const sent: string[] = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));

    const textarea = type(fixture, '   ');
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(sent).toEqual([]);
  });

  it('should cap the body at the length the domain accepts', () => {
    const fixture = createFixture();
    const textarea = fixture.debugElement.query(By.css('textarea'))
      .nativeElement as HTMLTextAreaElement;

    // The DTO advertises 40000, but the MessageBody value object rejects over
    // 4000 — mirroring the looser number would only produce an unavoidable 422.
    expect(textarea.getAttribute('maxlength')).toBe('4000');
  });

  it('should discard without sending', () => {
    const fixture = createFixture();
    const sent: string[] = [];
    fixture.componentInstance.sent.subscribe((body: string) => sent.push(body));

    const textarea = type(fixture, 'never mind');
    const discard = fixture.debugElement.query(By.css('[data-testid="message-composer-discard"]'));
    discard.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(sent).toEqual([]);
    expect(textarea.value).toBe('');
  });
});
