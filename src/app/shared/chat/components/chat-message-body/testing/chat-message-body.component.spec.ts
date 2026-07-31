import { TestBed } from '@angular/core/testing';
import { ChatMessageBody } from '../chat-message-body.component';

function render(bodyHtml: string): HTMLElement {
  TestBed.configureTestingModule({ imports: [ChatMessageBody] });

  const fixture = TestBed.createComponent(ChatMessageBody);
  fixture.componentRef.setInput('bodyHtml', bodyHtml);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

describe('ChatMessageBody', () => {
  it('renders nothing for an empty body', () => {
    expect(render('').textContent?.trim()).toBe('');
  });

  it('binds the HTML it is given', () => {
    const host = render('<p>Rien à signaler.</p>');

    expect(host.querySelector('p')?.textContent).toBe('Rien à signaler.');
  });

  it('keeps the tags the rich-text skin styles', () => {
    const host = render(
      '<p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s> <code>e</code></p>' +
        '<ul><li>f</li></ul><blockquote>g</blockquote><pre><code>h</code></pre>',
    );

    for (const tag of ['strong', 'em', 'u', 's', 'code', 'ul', 'li', 'blockquote', 'pre']) {
      expect(host.querySelector(tag)).not.toBeNull();
    }
  });

  it('keeps a chip the caller substituted in place, inside its formatting', () => {
    // The reason the body is one binding: split at the chip, `<strong>` is cut
    // across two bindings and the parser auto-closes each half.
    const host = render('<p><strong>hi <span class="chip">@Ana</span></strong></p>');

    expect(host.querySelector('strong > span.chip')?.textContent).toBe('@Ana');
  });

  it('lets Angular strip what its sanitizer refuses', () => {
    const host = render('<p>ok</p><script>alert(1)</script>');

    expect(host.querySelector('script')).toBeNull();
    expect(host.textContent).toContain('ok');
  });
});
