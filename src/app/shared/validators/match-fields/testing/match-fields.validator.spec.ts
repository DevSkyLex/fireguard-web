import { FormControl, FormGroup } from '@angular/forms';
import { MATCH_FIELDS_ERROR_KEY, matchFieldsValidator } from '..';

describe('matchFieldsValidator', () => {
  let form: FormGroup;

  beforeEach(() => {
    form = new FormGroup(
      {
        password: new FormControl(''),
        confirmPassword: new FormControl(''),
      },
      { validators: matchFieldsValidator('password', 'confirmPassword') },
    );
  });

  it('should return null when both fields match', () => {
    const passwordControl = form.get('password');
    const confirmPasswordControl = form.get('confirmPassword');

    expect(passwordControl).not.toBeNull();
    expect(confirmPasswordControl).not.toBeNull();

    passwordControl?.setValue('Secret123');
    confirmPasswordControl?.setValue('Secret123');
    expect(form.errors).toBeNull();
  });

  it('should return fieldMismatch error when fields do not match', () => {
    const passwordControl = form.get('password');
    const confirmPasswordControl = form.get('confirmPassword');

    expect(passwordControl).not.toBeNull();
    expect(confirmPasswordControl).not.toBeNull();

    passwordControl?.setValue('Secret123');
    confirmPasswordControl?.setValue('Different');
    expect(form.errors).toEqual({ [MATCH_FIELDS_ERROR_KEY]: true });
  });

  it('should return null when both fields are empty', () => {
    expect(form.errors).toBeNull();
  });

  it('should return null when a control name does not exist', () => {
    const validator = matchFieldsValidator('nonexistent', 'confirmPassword');
    const result = validator(form);
    expect(result).toBeNull();
  });
});
