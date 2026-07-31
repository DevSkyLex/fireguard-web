import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ChatAttachment } from '../../../../models';
import { ChatAttachmentList } from '../chat-attachment-list.component';

function render(attachments: readonly ChatAttachment[]): ComponentFixture<ChatAttachmentList> {
  const fixture = TestBed.createComponent(ChatAttachmentList);

  fixture.componentRef.setInput('attachments', attachments);
  fixture.detectChanges();

  return fixture;
}

describe('ChatAttachmentList', () => {
  it('draws nothing when a message carries no file', () => {
    // An empty <ul> would still occupy the row's gap.
    expect(render([]).nativeElement.querySelector('ul')).toBeNull();
  });

  it('names every file it is given', () => {
    const fixture = render([
      { id: 'a1', fileName: 'rapport-2026.pdf' },
      { id: 'a2', fileName: 'photo-extincteur.jpg' },
    ]);

    const names = [...fixture.nativeElement.querySelectorAll('li')].map(
      (item: Element): string => item.textContent?.trim() ?? '',
    );

    expect(names).toHaveLength(2);
    expect(names[0]).toContain('rapport-2026.pdf');
    expect(names[1]).toContain('photo-extincteur.jpg');
  });

  it('renders an untrusted file name as text, never as markup', () => {
    // File names come from whoever uploaded them; the row must not become an
    // injection point because someone named a file with a tag.
    const fixture = render([{ id: 'a1', fileName: '<img src=x onerror="alert(1)">.pdf' }]);

    expect(fixture.nativeElement.querySelector('li img')).toBeNull();
    expect(fixture.nativeElement.querySelector('li')?.textContent).toContain(
      '<img src=x onerror="alert(1)">.pdf',
    );
  });

  it("offers no link, because serving the file is the consumer's job", () => {
    const fixture = render([{ id: 'a1', fileName: 'rapport-2026.pdf' }]);

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
