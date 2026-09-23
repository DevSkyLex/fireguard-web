import { findHtmlTagClose } from '../find-html-tag-close.utils';

describe('findHtmlTagClose', () => {
  it('ignores closing brackets inside either attribute quote style', () => {
    const html = `<span title="A > B" data-note='C > D'>text</span>`;

    expect(findHtmlTagClose(html, 0)).toBe(html.indexOf('>text'));
  });

  it('reports an unterminated quoted attribute', () => {
    expect(findHtmlTagClose('<a title="unfinished>text', 0)).toBe(-1);
  });
});
