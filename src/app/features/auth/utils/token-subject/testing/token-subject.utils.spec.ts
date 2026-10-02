import { readJwtSubject } from '../token-subject.utils';
const jwt = (claims: unknown): string =>
  `header.${btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}.signature`;
describe('readJwtSubject', () => {
  it('reads only the subject claim used to compare trusted API token ownership', () => {
    expect(readJwtSubject(jwt({ sub: 'account-a', jti: 'different-token' }))).toBe('account-a');
  });
  it.each([
    '',
    'opaque',
    'header.invalid!payload.signature',
    jwt({}),
    jwt({ sub: '' }),
    jwt({ sub: '  ' }),
    jwt({ sub: 1 }),
    jwt([]),
    jwt(null),
  ])('refuses unreadable ownership: %s', (token) => expect(readJwtSubject(token)).toBeNull());
});
