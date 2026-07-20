import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AccountProfileForm } from '../account-profile-form.component';

type AccountProfileFormTestApi = AccountProfileForm & {
  form: {
    setValue(value: { firstName: string; lastName: string }): void;
    markAsDirty(): void;
  };
  submit(): void;
};

describe('AccountProfileForm', () => {
  let component: AccountProfileForm;
  let formComponent: AccountProfileFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AccountProfileForm());
    formComponent = component as unknown as AccountProfileFormTestApi;
  });

  it('should not emit invalid profile values', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    formComponent.form.setValue({
      firstName: 'A'.repeat(101),
      lastName: 'Lovelace',
    });

    formComponent.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit only changed valid profile values', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    formComponent.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    formComponent.submit();

    expect(emitSpy).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('should not emit when profile values are unchanged', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    formComponent.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  /**
   * Reset only has something to undo once the form is dirty. Offering it on an
   * untouched form advertises an action that does nothing — the neighbouring
   * Save button already guards on the same condition.
   */
  describe('reset affordance', () => {
    let fixture: ComponentFixture<AccountProfileForm>;

    const resetButton = (): HTMLButtonElement => {
      const button: HTMLButtonElement | undefined = fixture.debugElement
        .queryAll(By.css('button'))
        .map((debugElement): HTMLButtonElement => debugElement.nativeElement as HTMLButtonElement)
        .find((candidate: HTMLButtonElement): boolean =>
          (candidate.textContent ?? '').includes('Reset'),
        );

      if (!button) throw new Error('Reset button not rendered');

      return button;
    };

    beforeEach(() => {
      fixture = TestBed.createComponent(AccountProfileForm);
      fixture.detectChanges();
    });

    it('disables Reset while the form is untouched', () => {
      expect(resetButton().disabled).toBe(true);
    });

    it('enables Reset once a field has been edited', () => {
      (fixture.componentInstance as unknown as AccountProfileFormTestApi).form.markAsDirty();
      fixture.detectChanges();

      expect(resetButton().disabled).toBe(false);
    });
  });
});
