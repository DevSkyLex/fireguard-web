import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { AccountLanguageForm } from '../account-language-form.component';

type AccountLanguageFormTestApi = AccountLanguageForm & {
  onSelect(subPath: string): void;
};

describe('AccountLanguageForm', () => {
  let fixture: ComponentFixture<AccountLanguageForm>;
  let component: AccountLanguageForm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(AccountLanguageForm);
    fixture.componentRef.setInput('currentLocale', 'en');
    component = fixture.componentInstance;
  });

  it('emits the selected locale when it differs from the active one', () => {
    const emitSpy = vi.spyOn(component.localeSelected, 'emit');

    (component as unknown as AccountLanguageFormTestApi).onSelect('fr');

    expect(emitSpy).toHaveBeenCalledWith('fr');
  });

  it('does not emit when the selected locale is already active', () => {
    const emitSpy = vi.spyOn(component.localeSelected, 'emit');

    (component as unknown as AccountLanguageFormTestApi).onSelect('en');

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
