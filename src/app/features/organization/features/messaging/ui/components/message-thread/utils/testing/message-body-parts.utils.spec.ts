import { toMessageBodyParts } from '../message-body-parts.utils';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER = '660e8400-e29b-41d4-a716-446655440111';

describe('toMessageBodyParts', () => {
  it('should return nothing for an empty or deleted body', () => {
    expect(toMessageBodyParts(null)).toEqual([]);
    expect(toMessageBodyParts('')).toEqual([]);
  });

  it('should leave a body without mentions in one text part', () => {
    expect(toMessageBodyParts('Extinguisher check done.')).toEqual([
      { kind: 'text', value: 'Extinguisher check done.' },
    ]);
  });

  // Without this the reader sees a raw UUID in the middle of the sentence.
  it('should split a mention out of the surrounding text', () => {
    expect(toMessageBodyParts(`Hey @{${UUID}}, can you check?`)).toEqual([
      { kind: 'text', value: 'Hey ' },
      { kind: 'mention', value: UUID },
      { kind: 'text', value: ', can you check?' },
    ]);
  });

  it('should handle a mention at each end and several in a row', () => {
    expect(toMessageBodyParts(`@{${UUID}} @{${OTHER}}`)).toEqual([
      { kind: 'mention', value: UUID },
      { kind: 'text', value: ' ' },
      { kind: 'mention', value: OTHER },
    ]);
  });

  // The regex is the backend's, verbatim: a looser one would chip text the
  // server never treated as a mention.
  it('should ignore tokens that are not the backend mention form', () => {
    for (const body of ['@someone', `@{not-a-uuid}`, `@${UUID}`, `{${UUID}}`]) {
      expect(toMessageBodyParts(body)).toEqual([{ kind: 'text', value: body }]);
    }
  });

  // A module-level /g regex shares lastIndex between calls; reusing it would
  // silently skip the mention on every other message.
  it('should find the mention on repeated calls', () => {
    const body = `Hi @{${UUID}}`;

    expect(toMessageBodyParts(body)).toEqual(toMessageBodyParts(body));
    expect(toMessageBodyParts(body).some((part) => part.kind === 'mention')).toBe(true);
  });
});
