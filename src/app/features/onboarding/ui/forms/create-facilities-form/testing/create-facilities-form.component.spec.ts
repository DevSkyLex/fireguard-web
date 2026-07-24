import { TestBed } from '@angular/core/testing';
import { CreateFacilitiesForm } from '../create-facilities-form.component';

describe('CreateFacilitiesForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should render one facility row by default', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('First facility');
    expect(host.querySelectorAll('input[formControlName="name"]').length).toBe(1);
  });

  it('should add a new row when "Add another facility" is clicked', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another facility'),
    );

    addButton?.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('input[formControlName="name"]').length).toBe(2);
    expect(host.textContent).toContain('Facility 2');
  });

  it('should hide the add-row action once maxRows is reached', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const clickAdd = (): void => {
      const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
        el.textContent?.includes('Add another facility'),
      );
      addButton?.click();
      fixture.detectChanges();
    };

    clickAdd();
    clickAdd();
    clickAdd();
    clickAdd();

    expect(host.querySelectorAll('input[formControlName="name"]').length).toBe(5);
    const addButtonAfterMax = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (el) => el.textContent?.includes('Add another facility'),
    );
    expect(addButtonAfterMax).toBeUndefined();
  });

  it('should remove a row when its delete action is clicked, keeping the last one', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another facility'),
    );
    addButton?.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('input[formControlName="name"]').length).toBe(2);

    const removeButton = host.querySelector<HTMLButtonElement>('p-button[severity="danger"] button');
    removeButton?.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('input[formControlName="name"]').length).toBe(1);
    expect(host.querySelector('p-button[severity="danger"]')).toBeNull();
  });

  it('should show validation errors for name and type once touched', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const nameInput = host.querySelector<HTMLInputElement>('input[formControlName="name"]');

    nameInput?.dispatchEvent(new Event('focus'));
    nameInput?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('Name is required');
  });

  it('should show a minlength error message for a too-short name', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const nameInput = host.querySelector<HTMLInputElement>('input[formControlName="name"]');

    nameInput?.dispatchEvent(new Event('focus'));
    if (nameInput) nameInput.value = 'a';
    nameInput?.dispatchEvent(new Event('input'));
    nameInput?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.textContent).toContain('At least 2 characters');
  });

  it('should not emit submitted when the form is invalid', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit submitted with row values when the form is valid', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const nameInput = host.querySelector<HTMLInputElement>('input[formControlName="name"]');
    if (nameInput) nameInput.value = 'Paris HQ';
    nameInput?.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = host.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'site', name: 'Paris HQ', address: null }),
    ]);
  });

  it('should disable the form and show the loading submit button when loading is true', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.componentRef.setInput('loading', true);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const nameInput = host.querySelector<HTMLInputElement>('input[formControlName="name"]');
    expect(nameInput?.disabled).toBe(true);
    const submitButton = host.querySelector('p-button[type="submit"] button');
    expect(submitButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should pluralize the submit label based on row count', () => {
    const fixture = TestBed.createComponent(CreateFacilitiesForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Create facility');

    const addButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
      el.textContent?.includes('Add another facility'),
    );
    addButton?.click();
    fixture.detectChanges();

    expect(host.textContent).toContain('Create 2');
  });
});
