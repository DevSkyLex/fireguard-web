import {
  isFederatedAuthErrorCode,
  resolveFederatedAuthErrorMessage,
} from '../federated-auth-error.utils';

describe('resolveFederatedAuthErrorMessage', () => {
  it('should resolve a stable federation error code', () => {
    expect(resolveFederatedAuthErrorMessage('account_exists')).toBe(
      'Sign in with your password, then connect this provider from Security.',
    );
  });

  it('should hide an unknown server detail behind neutral copy', () => {
    expect(resolveFederatedAuthErrorMessage('sensitive upstream detail')).toBe(
      "We couldn't complete this request. Try again.",
    );
  });

  it.each([
    ['email_missing', 'The provider did not return an email address that Fireguard can use.'],
    ['identity_missing', 'The provider did not return an identity that Fireguard can use.'],
    ['federated_auth_failed', 'This sign-in provider is temporarily unavailable. Try again.'],
  ])('should resolve backend code %s', (code: string, message: string) => {
    expect(resolveFederatedAuthErrorMessage(code)).toBe(message);
  });
});

describe('isFederatedAuthErrorCode', () => {
  it.each(['provider_unavailable', 'last_sign_in_method', 'invalid_code'])(
    'should accept the stable code %s',
    (code: string) => expect(isFederatedAuthErrorCode(code)).toBe(true),
  );

  it('should reject an unknown value', () => {
    expect(isFederatedAuthErrorCode('future_detail')).toBe(false);
  });
});
