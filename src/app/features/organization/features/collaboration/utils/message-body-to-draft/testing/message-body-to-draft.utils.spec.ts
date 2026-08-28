import { messageBodyToDraft } from '../message-body-to-draft.utils';

describe('messageBodyToDraft', () => {
  it('returns an empty draft for a missing or empty body', () => {
    expect(messageBodyToDraft(undefined, {})).toBe('');
    expect(messageBodyToDraft('', {})).toBe('');
  });

  it('decodes the entities the server sanitizer escapes', () => {
    expect(
      messageBodyToDraft('1 &lt; 2 &amp;&amp; 3 &gt; 2, &quot;ok&quot; &#39;yes&#39;', {}),
    ).toBe('1 < 2 && 3 > 2, "ok" \'yes\'');
  });

  it('turns line-break tags into newlines and drops the rest', () => {
    expect(messageBodyToDraft('<p>first</p><p>second<br>third</p>', {})).toBe(
      'first\nsecond\nthird',
    );
  });

  it('rewrites a resolvable mention marker into its readable label', () => {
    const memberId = '7f1c0000-0000-0000-0000-000000000000';

    expect(messageBodyToDraft(`Hello &#64;{${memberId}}`, { [memberId]: 'Ana Costa' })).toBe(
      'Hello @Ana Costa',
    );
  });

  it('leaves an unresolvable marker untouched so the mention survives a save', () => {
    const memberId = '7f1c0000-0000-0000-0000-000000000000';

    expect(messageBodyToDraft(`ping &#64;{${memberId}}`, {})).toBe(`ping @{${memberId}}`);
  });
});
