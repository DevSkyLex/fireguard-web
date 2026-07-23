import { tokenizeMessageBody } from '../tokenize-message-body.utils';

describe('tokenizeMessageBody', () => {
  it('should return nothing for an absent body', () => {
    // A tombstone omits `body` entirely rather than sending an empty string.
    expect(tokenizeMessageBody(undefined)).toEqual([]);
    expect(tokenizeMessageBody('')).toEqual([]);
  });

  it('should pass a body without mentions through untouched', () => {
    expect(tokenizeMessageBody('<p>Rien à signaler.</p>')).toEqual([
      { kind: 'text', value: '<p>Rien à signaler.</p>' },
    ]);
  });

  it('should lift a mention out of the surrounding html', () => {
    const uuid = '7f1c8b2e-4a5d-4c3b-9e1f-2a3b4c5d6e7f';

    expect(tokenizeMessageBody(`<p>Bien reçu @{${uuid}}, je passe demain.</p>`)).toEqual([
      { kind: 'text', value: '<p>Bien reçu ' },
      { kind: 'mention', value: uuid },
      { kind: 'text', value: ', je passe demain.</p>' },
    ]);
  });

  it('should handle several mentions, including adjacent ones', () => {
    const first = '11111111-1111-1111-1111-111111111111';
    const second = '22222222-2222-2222-2222-222222222222';

    expect(tokenizeMessageBody(`@{${first}}@{${second}} ok`)).toEqual([
      { kind: 'mention', value: first },
      { kind: 'mention', value: second },
      { kind: 'text', value: ' ok' },
    ]);
  });

  it('should not treat a malformed marker as a mention', () => {
    // Only a well-formed 36-character id counts; anything else is plain text.
    expect(tokenizeMessageBody('call @{nope} now')).toEqual([
      { kind: 'text', value: 'call @{nope} now' },
    ]);
  });

  it('should be stable across calls despite the global pattern', () => {
    const body = '@{33333333-3333-3333-3333-333333333333} hi';

    // A global regex carries `lastIndex`; reusing one across calls would make
    // the second invocation miss the match.
    expect(tokenizeMessageBody(body)).toEqual(tokenizeMessageBody(body));
  });
});
