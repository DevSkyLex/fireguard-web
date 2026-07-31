import { findMentionQuery } from '../find-mention-query.utils';

describe('findMentionQuery', () => {
  it('reports the run the caret is inside', () => {
    expect(findMentionQuery('ping @jea', 9)).toEqual({ start: 5, end: 9, term: 'jea' });
  });

  it('opens on a bare @ so the list can offer everyone', () => {
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, end: 1, term: '' });
  });

  it('keeps matching across a space, because display names contain them', () => {
    expect(findMentionQuery('@Jean D', 7)).toEqual({ start: 0, end: 7, term: 'Jean D' });
  });

  it('closes once the term ends on whitespace', () => {
    // This is what stops the list re-opening on itself: accepting a candidate
    // leaves the caret one space past the inserted label.
    expect(findMentionQuery('@Jean ', 6)).toBeNull();
  });

  it('ignores an @ that does not start a word', () => {
    expect(findMentionQuery('mail me at a@b', 14)).toBeNull();
  });

  it('does not reach back across a line break', () => {
    expect(findMentionQuery('@jean\nhello', 11)).toBeNull();
  });

  it('leaves an @ inside a code span alone', () => {
    expect(findMentionQuery('`@root', 6)).toBeNull();
  });

  it('gives up on a run longer than a plausible name', () => {
    expect(findMentionQuery(`@${'x'.repeat(40)}`, 41)).toBeNull();
  });

  it('only looks behind the caret', () => {
    expect(findMentionQuery('ping @jean', 3)).toBeNull();
  });
});
