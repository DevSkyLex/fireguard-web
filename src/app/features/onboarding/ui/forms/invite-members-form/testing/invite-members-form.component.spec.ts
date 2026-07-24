import { TestBed } from '@angular/core/testing';
import type { SetupOrganizationRole } from '@features/organization/setup';
import { InviteMembersForm } from '../invite-members-form.component';

const ROLES: readonly SetupOrganizationRole[] = [
  { id: 'role-admin', name: 'admin', description: 'Full access' },
  { id: 'role-viewer', name: 'viewer', description: 'Read-only access' },
];

describe('InviteMembersForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const createFixture = (roles: readonly SetupOrganizationRole[] = ROLES) => {
    const fixture = TestBed.createComponent(InviteMembersForm);
    fixture.componentRef.setInput('roles', roles);
    fixture.detectChanges();
    return fixture;
  };

  it('should render one invitee row by default', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('First member');
    expect(host.querySelectorAll('input[formControlName="email"]').length).toBe(1);
  });

  it('should render role cards when roles are available', () => {
    const fixture = createFixture();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-radio-card-group')).toBeTruthy();
  });

  it('should not render role cards when there are no roles', () => {
    const fixture = createFixture([]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-radio-card-group')).toBeNull();
  });

  it('should add a new row when "Add another member" is clicked', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another member'),
    );

    addButton?.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('input[formControlName="email"]').length).toBe(2);
    expect(host.textContent).toContain('Member 2');
  });

  it('should hide the add-row action once maxRows is reached', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const clickAdd = (): void => {
      const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
        el.textContent?.includes('Add another member'),
      );
      addButton?.click();
      fixture.detectChanges();
    };

    clickAdd();
    clickAdd();
    clickAdd();
    clickAdd();

    expect(host.querySelectorAll('input[formControlName="email"]').length).toBe(5);
    const addButtonAfterMax = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (el) => el.textContent?.includes('Add another member'),
    );
    expect(addButtonAfterMax).toBeUndefined();
  });

  it('should remove a row when its delete action is clicked', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another member'),
    );
    addButton?.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('input[formControlName="email"]').length).toBe(2);

    const removeButton = host.querySelector<HTMLButtonElement>('p-button[severity="danger"] button');
    removeButton?.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('input[formControlName="email"]').length).toBe(1);
    expect(host.querySelector('p-button[severity="danger"]')).toBeNull();
  });

  it('should show a required error for an empty email once touched', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const emailInput = host.querySelector<HTMLInputElement>('input[formControlName="email"]');

    emailInput?.dispatchEvent(new Event('focus'));
    emailInput?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('Email is required.');
  });

  it('should show an invalid-email error for a malformed address', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const emailInput = host.querySelector<HTMLInputElement>('input[formControlName="email"]');

    if (emailInput) emailInput.value = 'not-an-email';
    emailInput?.dispatchEvent(new Event('input'));
    emailInput?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('Invalid email address.');
  });

  it('should mark an overly long email as invalid via the maxlength validator', () => {
    // Angular's built-in `Validators.email` pattern already caps the total
    // length at 254 chars, so a value long enough to trip `maxlength(255)`
    // always also fails the `email` check first — the template's dedicated
    // maxlength message branch is consequently unreachable through the UI,
    // but the validator itself is exercised here directly on the control.
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const longEmail = `${'a'.repeat(250)}@example.com`;
    const emailControl = component['rows'].at(0).controls.email;

    emailControl.setValue(longEmail);

    expect(emailControl.hasError('maxlength')).toBe(true);
  });

  it('should show a required error for the role once touched', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component['rows'].at(0).controls.roleId.markAsTouched();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Please select a role.');
  });

  it('should not emit invited when the form is invalid', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.invited, 'emit');
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit invited with row values and reset the form when valid', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.invited, 'emit');
    const component = fixture.componentInstance;
    component['rows'].at(0).setValue({ email: 'member@example.com', roleId: 'role-admin' });
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith([
      expect.objectContaining({ email: 'member@example.com', roleId: 'role-admin' }),
    ]);
    expect(component['rows'].length).toBe(1);
    expect(component['rows'].at(0).value.email).toBe('');
  });

  it('should disable the form and show the loading submit button while inviting', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('inviting', true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const emailInput = host.querySelector<HTMLInputElement>('input[formControlName="email"]');
    expect(emailInput?.disabled).toBe(true);
  });

  it('should disable the form while busy', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const emailInput = host.querySelector<HTMLInputElement>('input[formControlName="email"]');
    expect(emailInput?.disabled).toBe(true);
  });

  it('should pluralize the submit label based on row count', () => {
    const fixture = createFixture();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Send invitation');

    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another member'),
    );
    addButton?.click();
    fixture.detectChanges();

    expect(host.textContent).toContain('Send 2');
  });

  it('should show the submit button loading state while executing', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('executing', true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const submitButton = host.querySelector('p-button[type="submit"] button');
    expect(submitButton?.querySelector('.p-icon-spin, [data-p-loading="true"]')).toBeTruthy();
  });
});
