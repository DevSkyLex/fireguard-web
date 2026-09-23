import { splitHtmlSegments } from '../split-html-segments.utils';

describe('splitHtmlSegments', () => {
  it('separates text from tags while keeping attributes untouched', () => {
    expect(splitHtmlSegments('<a href="x>y">hello</a>')).toEqual([
      { value: '<a href="x>y">', isTag: true },
      { value: 'hello', isTag: false },
      { value: '</a>', isTag: true },
    ]);
  });

  it('respects both quote styles and keeps mention-like attribute text inside the tag', () => {
    expect(
      splitHtmlSegments(`<span title="@Alice > team" data-note='A > B'>Hi @Alice</span>`),
    ).toEqual([
      { value: `<span title="@Alice > team" data-note='A > B'>`, isTag: true },
      { value: 'Hi @Alice', isTag: false },
      { value: '</span>', isTag: true },
    ]);
  });

  it('preserves a tag with an unterminated quoted attribute as text', () => {
    expect(splitHtmlSegments('before <a title="unfinished>after')).toEqual([
      { value: 'before ', isTag: false },
      { value: '<a title="unfinished>after', isTag: false },
    ]);
    expect(splitHtmlSegments("before <a title='closed > quote'")).toEqual([
      { value: 'before ', isTag: false },
      { value: "<a title='closed > quote'", isTag: false },
    ]);
  });

  it('keeps unterminated tags as text', () => {
    expect(splitHtmlSegments('hello <'.repeat(1000))).toEqual([
      { value: 'hello ', isTag: false },
      { value: '<' + 'hello <'.repeat(999), isTag: false },
    ]);
  });
});
