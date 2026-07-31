import { normalizeEditorHtml } from '../normalize-editor-html.utils';

describe('normalizeEditorHtml', () => {
  it('leaves an empty body alone', () => {
    expect(normalizeEditorHtml('')).toBe('');
  });

  it('turns every non-breaking space back into an ordinary one', () => {
    // Quill's serializer encodes *every* space, not just runs of them, which
    // glues a stored message into one unwrappable line.
    expect(normalizeEditorHtml('<p>Etat&nbsp;du&nbsp;site</p>')).toBe('<p>Etat du site</p>');
  });

  it('normalizes inside formatting too', () => {
    expect(normalizeEditorHtml('<ul><li>point&nbsp;un</li></ul>')).toBe(
      '<ul><li>point un</li></ul>',
    );
  });

  it('leaves attribute values untouched', () => {
    expect(normalizeEditorHtml('<a href="https://x.test/a&nbsp;b">a&nbsp;b</a>')).toBe(
      '<a href="https://x.test/a&nbsp;b">a b</a>',
    );
  });
});
