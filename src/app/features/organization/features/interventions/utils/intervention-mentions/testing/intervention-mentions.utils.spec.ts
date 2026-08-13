import type { MemberSelectOption } from '@features/organization/features/interventions/models';
import {
  findInterventionMentionQuery,
  interventionMemberId,
  parseInterventionMentions,
  resolveInterventionMentionMember,
} from '../intervention-mentions.utils';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_UUID = 'a1b2c3d4-5717-4562-b3fc-2c963f66afa6';

const member = (overrides: Partial<MemberSelectOption> = {}): MemberSelectOption => ({
  value: `/api/organizations/org-1/members/${UUID}`,
  label: 'Jane Doe',
  displayName: 'Jane Doe',
  roleLabel: 'Manager',
  avatarUrl: null,
  initials: 'JD',
  ...overrides,
});

describe('parseInterventionMentions', () => {
  it('should return one text segment for a body with no mention', () => {
    expect(parseInterventionMentions('Checked the panel.')).toEqual([
      { kind: 'text', value: 'Checked the panel.' },
    ]);
  });

  it('should split text around a mention token', () => {
    expect(parseInterventionMentions(`ping @{${UUID}} now`)).toEqual([
      { kind: 'text', value: 'ping ' },
      { kind: 'mention', value: UUID },
      { kind: 'text', value: ' now' },
    ]);
  });

  it('should resolve adjacent mention tokens with no text between them', () => {
    expect(parseInterventionMentions(`@{${UUID}}@{${OTHER_UUID}}`)).toEqual([
      { kind: 'mention', value: UUID },
      { kind: 'mention', value: OTHER_UUID },
    ]);
  });

  it('should treat a mention at the very start or end of the body correctly', () => {
    expect(parseInterventionMentions(`@{${UUID}} start`)).toEqual([
      { kind: 'mention', value: UUID },
      { kind: 'text', value: ' start' },
    ]);
    expect(parseInterventionMentions(`end @{${UUID}}`)).toEqual([
      { kind: 'text', value: 'end ' },
      { kind: 'mention', value: UUID },
    ]);
  });

  it('should leave a malformed or non-uuid token as literal text', () => {
    expect(parseInterventionMentions('@{not-a-uuid}')).toEqual([
      { kind: 'text', value: '@{not-a-uuid}' },
    ]);
    expect(parseInterventionMentions('@{123}')).toEqual([{ kind: 'text', value: '@{123}' }]);
  });

  it('should return an empty array for an empty body', () => {
    expect(parseInterventionMentions('')).toEqual([]);
  });
});

describe('findInterventionMentionQuery', () => {
  it('should return null when the caret is not inside an @-run', () => {
    expect(findInterventionMentionQuery('Checked the panel.', 5)).toBeNull();
  });

  it('should report the term typed since the @', () => {
    expect(findInterventionMentionQuery('ping @jea', 9)).toEqual({
      start: 5,
      end: 9,
      term: 'jea',
    });
  });

  it('should treat an email-shaped run as not a mention', () => {
    expect(findInterventionMentionQuery('foo@bar', 7)).toBeNull();
  });

  it('should close the query at a newline', () => {
    expect(findInterventionMentionQuery('@jean\nnext line', 11)).toBeNull();
  });

  it('should close the query once the term ends on whitespace', () => {
    expect(findInterventionMentionQuery('@jean ', 6)).toBeNull();
  });

  it('should give up once the term exceeds the length ceiling', () => {
    const long = `@${'a'.repeat(40)}`;
    expect(findInterventionMentionQuery(long, long.length)).toBeNull();
  });
});

describe('resolveInterventionMentionMember', () => {
  it('should resolve the member whose id matches the mention token', () => {
    const target = member();

    expect(resolveInterventionMentionMember(UUID, [target])).toBe(target);
  });

  it('should return null when no loaded member matches', () => {
    expect(resolveInterventionMentionMember(OTHER_UUID, [member()])).toBeNull();
  });
});

describe('interventionMemberId', () => {
  it('should read the uuid off the trailing IRI segment', () => {
    expect(interventionMemberId(member())).toBe(UUID);
  });
});
