import { TestBed } from '@angular/core/testing';
import { RecoveryCodeForm } from '../recovery-code-form.component';

describe('RecoveryCodeForm', () => {
  it('normalizes a complete grouped recovery proof and rejects incomplete input', async () => {
    const fixture = TestBed.createComponent(RecoveryCodeForm);
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = '1234-5678-9ABC-DEF0-1234-5678-9ABC-DEF0';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(submitted).toHaveBeenCalledWith('123456789abcdef0123456789abcdef0');
    input.value = '1234';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(submitted).toHaveBeenCalledTimes(1);
  });
});
