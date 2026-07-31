import { chatBodyToText } from '../chat-body-to-text.utils';

describe('chatBodyToText', () => {
  it('drops the markup', () => {
    expect(chatBodyToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes the entities the renderer escaped', () => {
    // The API's sanitizer rewrites every `@`, so a mention arrives escaped and
    // would otherwise be pasted as `&#64;Ana`.
    expect(chatBodyToText('<p>&#64;Ana &amp; Bob</p>')).toBe('@Ana & Bob');
  });

  it('breaks the line where the markup drew one', () => {
    expect(chatBodyToText('<p>first</p><p>second</p>')).toBe('first\nsecond');
    expect(chatBodyToText('<p>first<br>second</p>')).toBe('first\nsecond');
  });

  it('keeps a list readable', () => {
    expect(chatBodyToText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb');
  });

  it('collapses the run of blank lines nested blocks leave behind', () => {
    expect(chatBodyToText('<blockquote><p>quoted</p></blockquote><p>after</p>')).toBe(
      'quoted\n\nafter',
    );
  });

  it('returns nothing for an empty body', () => {
    expect(chatBodyToText('')).toBe('');
  });
});
