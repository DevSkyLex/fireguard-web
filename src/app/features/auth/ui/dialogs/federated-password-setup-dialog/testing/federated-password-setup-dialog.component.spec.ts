import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HlmDialog } from '@shared/ui/dialog';
import { FederatedPasswordSetupDialog } from '../federated-password-setup-dialog.component';

describe('FederatedPasswordSetupDialog', () => {
  let fixture: ComponentFixture<FederatedPasswordSetupDialog>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FederatedPasswordSetupDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('challengeToken', 'challenge-1');
    fixture.componentRef.setInput('maskedRecipient', 'm***@example.com');
    await fixture.whenStable();
  });

  /**
   * Function fillPassword
   * @description Enters password setup values through native Signal Forms controls.
   * @access private
   * @since 1.0.0
   * @param {string} code - Emailed verification code.
   * @param {string} confirmation - Repeated password value.
   * @returns {Promise<void>} Completion of control rendering.
   */
  async function fillPassword(code = '123456', confirmation = 'StrongPassword123!'): Promise<void> {
    for (const [id, value] of [
      ['federated-password-code', code],
      ['federated-new-password', 'StrongPassword123!'],
      ['federated-confirm-password', confirmation],
    ]) {
      const input = document.getElementById(id) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    await fixture.whenStable();
  }

  it('emits the challenge, code and password without transmitting confirmation', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await fillPassword();
    document
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submitted).toHaveBeenCalledExactlyOnceWith({
      token: 'challenge-1',
      code: '123456',
      newPassword: 'StrongPassword123!',
    });
  });

  it.each([
    ['12x456', 'StrongPassword123!'],
    ['123456', 'DifferentPassword123!'],
  ])('rejects an invalid code or password confirmation (%s)', async (code, confirmation) => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await fillPassword(code, confirmation);
    document
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(submitted).not.toHaveBeenCalled();
    expect(document.querySelector('hlm-field-error')).not.toBeNull();
  });

  it('blocks a second password confirmation while the first is pending', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await fillPassword();
    fixture.componentRef.setInput('confirmPending', true);
    await fixture.whenStable();
    document
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(submitted).not.toHaveBeenCalled();
  });

  it('clears entered secrets before requesting a replacement challenge', async () => {
    const restarted = vi.fn();
    fixture.componentInstance.restartRequested.subscribe(restarted);
    await fillPassword();
    fixture.componentRef.setInput('error', 'The code expired.');
    await fixture.whenStable();
    const resend = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Send code',
    );
    resend?.click();
    await fixture.whenStable();
    expect(restarted).toHaveBeenCalledOnce();
    for (const id of [
      'federated-password-code',
      'federated-new-password',
      'federated-confirm-password',
    ]) {
      expect((document.getElementById(id) as HTMLInputElement).value).toBe('');
    }
  });

  it('reports native close events and clears the values retained by the mounted component', async () => {
    const visibility = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(visibility);
    await fillPassword();
    fixture.debugElement
      .query(By.directive(HlmDialog))
      .triggerEventHandler('stateChanged', 'closed');
    await fixture.whenStable();
    expect(visibility).toHaveBeenCalledExactlyOnceWith(false);
    expect((document.getElementById('federated-password-code') as HTMLInputElement).value).toBe('');
  });

  it('asks the owner to send a code without constructing a challenge locally', async () => {
    const requested = vi.fn();
    fixture.componentInstance.codeRequested.subscribe(requested);
    fixture.componentRef.setInput('challengeToken', null);
    await fixture.whenStable();
    const send = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Send code',
    );
    send?.click();
    expect(requested).toHaveBeenCalledOnce();
    expect(document.querySelector('form')).toBeNull();
  });
});
