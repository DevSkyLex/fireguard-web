import { chunkMemberIds } from '../utils';

describe('chunkMemberIds', () => {
  it('should return nothing for an empty list', () => {
    expect(chunkMemberIds([])).toEqual([]);
  });

  it('should reduce member IRIs to bare ids', () => {
    // The provider parses IRIs for `organization` only; `memberIds` must be
    // bare or the server simply will not match them.
    expect(chunkMemberIds(['/api/organizations/org-1/members/mem-1', 'mem-2'])).toEqual([
      ['mem-1', 'mem-2'],
    ]);
  });

  it('should drop duplicates, including across the two forms', () => {
    expect(chunkMemberIds(['mem-1', '/api/organizations/org-1/members/mem-1', 'mem-2'])).toEqual([
      ['mem-1', 'mem-2'],
    ]);
  });

  it('should ignore blank references', () => {
    expect(chunkMemberIds(['mem-1', '', '   ', '/api/x/'])).toEqual([['mem-1']]);
  });

  it('should split at the server cap rather than truncate', () => {
    const ids: string[] = Array.from({ length: 250 }, (_unused, index) => `mem-${index}`);

    const batches = chunkMemberIds(ids);

    // Exceeding 100 is a 400, not a truncation — so the caller must batch.
    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50]);
  });

  it('should count uniqueness before the cap, as the server does', () => {
    // 150 references, 100 unique: legal in one request.
    const ids: string[] = [
      ...Array.from({ length: 100 }, (_unused, index) => `mem-${index}`),
      ...Array.from({ length: 50 }, (_unused, index) => `mem-${index}`),
    ];

    expect(chunkMemberIds(ids)).toHaveLength(1);
  });
});
