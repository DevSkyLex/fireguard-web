import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { form, required, type FieldTree } from '@angular/forms/signals';
import { PasswordInput } from '../password-input.component';

/**
 * A host, because the component takes a `FieldTree` — building one needs an
 * injection context, and driving it through a real parent is what proves the
 * binding rather than the input plumbing alone.
 */
@Component({
  selector: 'app-password-input-host',
  imports: [PasswordInput],
  template: `<app-password-input
    inputId="test-password"
    autocomplete="new-password"
    placeholder="Your password"
    [field]="hostForm.password"
  />`,
})
class PasswordInputHost {
  public readonly model: WritableSignal<{ password: string }> = signal({ password: '' });
  public readonly hostForm: FieldTree<{ password: string }> = form(this.model, (path): void => {
    required(path.password);
  });
}

describe('PasswordInput', () => {
  let fixture: ComponentFixture<PasswordInputHost>;

  /**
   * The reveal control, which is the only button this component renders.
   */
  function toggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  /**
   * The field itself.
   */
  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#test-password') as HTMLInputElement;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PasswordInputHost);
    await fixture.whenStable();
  });

  it('should mask the value by default', () => {
    expect(input().type).toBe('password');
  });

  it('should apply the caller-supplied id, autocomplete and placeholder', () => {
    expect(input().id).toBe('test-password');
    expect(input().getAttribute('autocomplete')).toBe('new-password');
    expect(input().getAttribute('placeholder')).toBe('Your password');
  });

  it('should reveal the value when the control is used', async () => {
    toggle().click();
    await fixture.whenStable();

    expect(input().type).toBe('text');
  });

  it('should mask the value again on a second use', async () => {
    toggle().click();
    await fixture.whenStable();
    toggle().click();
    await fixture.whenStable();

    expect(input().type).toBe('password');
  });

  it('should name the action it will perform, not the current state', async () => {
    expect(toggle().getAttribute('aria-label')).toBe('Show password');

    toggle().click();
    await fixture.whenStable();

    expect(toggle().getAttribute('aria-label')).toBe('Hide password');
  });

  it('should expose the reveal state through aria-pressed', async () => {
    expect(toggle().getAttribute('aria-pressed')).toBe('false');

    toggle().click();
    await fixture.whenStable();

    expect(toggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('should stay reachable by keyboard', () => {
    // No negative `tabindex`: the reveal is a functional control, and taking it
    // out of the tab order would remove keyboard access to it entirely.
    expect(toggle().getAttribute('tabindex')).toBeNull();
  });

  it('should seat the control in a spartan input group rather than over the field', () => {
    // The addon takes real layout space, so a long value scrolls beside the
    // button instead of under it.
    expect(fixture.nativeElement.querySelector('hlm-input-group')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('hlm-input-group-addon[data-align="inline-end"]'),
    ).not.toBeNull();
  });

  it('should write what the user types back to the bound field', async () => {
    input().value = 'Str0ng!Passw0rd';
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.hostForm.password().value()).toBe('Str0ng!Passw0rd');
  });
});
