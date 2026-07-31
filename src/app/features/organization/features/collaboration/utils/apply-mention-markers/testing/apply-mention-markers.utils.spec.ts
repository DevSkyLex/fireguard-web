import { applyMentionMarkers } from '../apply-mention-markers.utils';

const ANA = 'a1111111-1111-4111-8111-111111111111';
const ANA_COSTA = 'b2222222-2222-4222-8222-222222222222';

describe('applyMentionMarkers', () => {
  it('leaves a body without mentions alone', () => {
    expect(applyMentionMarkers('<p>nothing here</p>', new Map())).toBe('<p>nothing here</p>');
  });

  it('substitutes every occurrence of a label', () => {
    expect(applyMentionMarkers('<p>@Ana and @Ana again</p>', new Map([['Ana', ANA]]))).toBe(
      `<p>@{${ANA}} and @{${ANA}} again</p>`,
    );
  });

  it('substitutes the longest label first', () => {
    // Left to insertion order, `@Ana` would eat the front of `@Ana Costa` and
    // mention the wrong member.
    expect(
      applyMentionMarkers(
        '<p>@Ana Costa</p>',
        new Map([
          ['Ana', ANA],
          ['Ana Costa', ANA_COSTA],
        ]),
      ),
    ).toBe(`<p>@{${ANA_COSTA}}</p>`);
  });

  it('substitutes across the formatting the editor produces', () => {
    expect(applyMentionMarkers('<p><strong>hi @Ana</strong></p>', new Map([['Ana', ANA]]))).toBe(
      `<p><strong>hi @{${ANA}}</strong></p>`,
    );
  });

  it('never touches an attribute', () => {
    // A label that also occurs inside an href must not be rewritten into the
    // middle of a URL.
    expect(
      applyMentionMarkers('<p><a href="https://x.test/@Ana">@Ana</a></p>', new Map([['Ana', ANA]])),
    ).toBe(`<p><a href="https://x.test/@Ana">@{${ANA}}</a></p>`);
  });

  it('matches a label the serializer escaped', () => {
    const label = 'A & B';

    expect(applyMentionMarkers('<p>@A &amp; B</p>', new Map([[label, ANA]]))).toBe(
      `<p>@{${ANA}}</p>`,
    );
  });

  it('drops a mention the author has since deleted', () => {
    expect(applyMentionMarkers('<p>never mind</p>', new Map([['Ana', ANA]]))).toBe(
      '<p>never mind</p>',
    );
  });
});
