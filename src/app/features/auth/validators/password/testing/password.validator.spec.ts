import { Injector, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, type FieldTree } from '@angular/forms/signals';
import type { PasswordPolicyOutput } from '@features/auth/models';
import { DEFAULT_PASSWORD_POLICY } from '@features/auth/state/password-policy/testing/password-policy.fixture';
import { applyPasswordConfirmation, applyPasswordRules } from '../password.validator';

/**
 * The shape both password surfaces edit.
 */
interface PasswordModel {
  password: string;
  confirmPassword: string;
}

/**
 * Builds the field tree the rules under test are applied to. Signal Forms needs
 * an injection context, so the injector is passed explicitly rather than left
 * to an ambient one — the requirement then stays visible at the call site.
 */
function createForm(
  initial: Partial<PasswordModel> = {},
  policy: () => PasswordPolicyOutput | null = () => DEFAULT_PASSWORD_POLICY,
): FieldTree<PasswordModel> {
  const model: WritableSignal<PasswordModel> = signal<PasswordModel>({
    password: '',
    confirmPassword: '',
    ...initial,
  });

  return form(
    model,
    (path): void => {
      applyPasswordRules(path.password, policy);
      applyPasswordConfirmation(path.confirmPassword, path.password);
    },
    { injector: TestBed.inject(Injector) },
  );
}

describe('applyPasswordRules', () => {
  it('reacts to a custom server policy and blocks unavailable requirements', () => {
    const policy = signal<PasswordPolicyOutput | null>({
      ...DEFAULT_PASSWORD_POLICY,
      minimumLength: 3,
      maximumLength: 5,
      requireUppercase: false,
      requireLowercase: false,
      requireDigit: false,
      specialCharacters: '',
      allowedInitialCharacters: null,
    });
    const fields = createForm({ password: 'abc' }, policy);
    expect(fields.password().valid()).toBe(true);
    policy.update((value) => (value ? { ...value, minimumLength: 4 } : value));
    expect(fields.password().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'minLength' })]),
    );
    policy.set(null);
    expect(fields.password().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'policyUnavailable' })]),
    );
  });

  it('counts code points and obeys the supplied initial-character alphabet', () => {
    const policy = {
      ...DEFAULT_PASSWORD_POLICY,
      minimumLength: 3,
      maximumLength: 3,
      requireUppercase: false,
      requireLowercase: false,
      requireDigit: false,
      specialCharacters: '',
      allowedInitialCharacters: '😀',
    };
    expect(
      createForm({ password: '😀ab' }, () => policy)
        .password()
        .valid(),
    ).toBe(true);
    expect(
      createForm({ password: 'abc' }, () => policy)
        .password()
        .errors(),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'initialCharacter' })]));
  });

  it('should reject an empty password as required', () => {
    const passwordForm = createForm();

    expect(passwordForm.password().invalid()).toBe(true);
    expect(passwordForm.password().errors()).toEqual([
      expect.objectContaining({ kind: 'required' }),
    ]);
  });

  it('should reject a password shorter than the policy minimum', () => {
    const passwordForm = createForm({ password: 'Ab1!' });

    expect(passwordForm.password().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'minLength' })]),
    );
  });

  it('should reject a password missing the required character classes', () => {
    const passwordForm = createForm({ password: 'alllowercase' });

    expect(passwordForm.password().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'uppercase' })]),
    );
  });

  it('should accept a password satisfying every rule', () => {
    const passwordForm = createForm({ password: 'Str0ng!Passw0rd' });

    expect(passwordForm.password().valid()).toBe(true);
    expect(passwordForm.password().errors()).toEqual([]);
  });
});

describe('applyPasswordConfirmation', () => {
  it('should reject a confirmation that does not repeat the password', () => {
    const passwordForm = createForm({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Different!Passw0rd',
    });

    expect(passwordForm.confirmPassword().invalid()).toBe(true);
    expect(passwordForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });

  it('should accept a confirmation that matches', () => {
    const passwordForm = createForm({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });

    expect(passwordForm.confirmPassword().valid()).toBe(true);
    expect(passwordForm.confirmPassword().errors()).toEqual([]);
  });

  it('should re-evaluate when the password it mirrors changes', () => {
    const passwordForm = createForm({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Str0ng!Passw0rd',
    });

    expect(passwordForm.confirmPassword().valid()).toBe(true);

    // Editing the password must invalidate a confirmation that was valid a
    // moment ago: the rule reads its sibling, so it is the sibling changing
    // that has to re-run it.
    passwordForm.password().value.set('Another!Passw0rd');

    expect(passwordForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });

  it('should report the mismatch on the confirmation, never on the password', () => {
    const passwordForm = createForm({
      password: 'Str0ng!Passw0rd',
      confirmPassword: 'Different!Passw0rd',
    });

    expect(passwordForm.password().valid()).toBe(true);
    expect(passwordForm.password().errors()).toEqual([]);
  });
});
