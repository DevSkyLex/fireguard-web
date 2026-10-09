import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import { HlmSheet } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { CustomerEditorSheet } from '../customer-editor-sheet.component';

const button = (text: string): HTMLButtonElement => {
  const found = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!found) throw new Error('Missing action: ' + text);
  return found;
};

describe('CustomerEditorSheet', () => {
  const customer: CustomerOutput = {
    '@id': '/api/organizations/org/customers/customer',
    '@type': 'Customer',
    id: 'customer',
    organizationId: 'org',
    name: 'Hospital',
    contacts: [],
    revision: 1,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  let fixture: ComponentFixture<CustomerEditorSheet>;
  let dismissed: ReturnType<typeof vi.fn<() => void>>;
  const mobile = signal(false);

  beforeEach(() => {
    mobile.set(false);
    TestBed.configureTestingModule({
      imports: [CustomerEditorSheet],
      providers: [
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
      ],
    });
    fixture = TestBed.createComponent(CustomerEditorSheet);
    dismissed = vi.fn<() => void>();
    fixture.componentInstance.dismissed.subscribe(dismissed);
  });
  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  };
  const confirmation = (): UnsavedChangesDialog =>
    fixture.debugElement.query(By.directive(UnsavedChangesDialog))
      .componentInstance as UnsavedChangesDialog;
  const fillName = async (value: string): Promise<void> => {
    const input = document.querySelector('#customer-name') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('uses the create or edit title and forwards normalized form submissions', async () => {
    const emitted: CustomerInput[] = [];
    fixture.componentInstance.submitted.subscribe((input) => emitted.push(input));
    await open();
    expect(document.querySelector('[hlmSheetTitle]')?.textContent).toBe('New customer');
    await fillName(' New Hospital ');
    (document.querySelector('app-customer-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
    expect(emitted).toEqual([
      { name: 'New Hospital', code: null, email: null, phone: null, contacts: [] },
    ]);
    fixture.componentRef.setInput('customer', customer);
    await fixture.whenStable();
    expect(document.querySelector('[hlmSheetTitle]')?.textContent).toBe('Edit customer');
    expect((document.querySelector('#customer-name') as HTMLInputElement).value).toBe('Hospital');
  });

  it('dismisses an untouched form and ignores native open-state echoes', async () => {
    await open();
    fixture.debugElement.query(By.directive(HlmSheet)).triggerEventHandler('stateChanged', 'open');
    expect(dismissed).not.toHaveBeenCalled();
    button('Cancel').click();
    expect(dismissed).toHaveBeenCalledOnce();
    expect(confirmation().state()).toBe('closed');
  });

  it('keeps a dirty draft on cancellation and dismisses only after explicit discard', async () => {
    await open();
    await fillName('My draft');
    button('Cancel').click();
    await fixture.whenStable();
    expect(confirmation().state()).toBe('open');
    expect(dismissed).not.toHaveBeenCalled();
    confirmation().dismissed.emit();
    await fixture.whenStable();
    expect(confirmation().state()).toBe('closed');
    expect((document.querySelector('#customer-name') as HTMLInputElement).value).toBe('My draft');
    button('Cancel').click();
    await fixture.whenStable();
    confirmation().confirmed.emit();
    await fixture.whenStable();
    expect(confirmation().state()).toBe('closed');
    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('routes a native close request through dirty-draft confirmation', async () => {
    await open();
    await fillName('My draft');
    fixture.debugElement
      .query(By.directive(HlmSheet))
      .triggerEventHandler('stateChanged', 'closed');
    await fixture.whenStable();
    expect(confirmation().state()).toBe('open');
    expect(dismissed).not.toHaveBeenCalled();
    expect((document.querySelector('#customer-name') as HTMLInputElement).value).toBe('My draft');
  });

  it('retains rejected drafts, emits conflict refresh and locks native dismissal while writing', async () => {
    const refreshed = vi.fn();
    fixture.componentInstance.refreshRequested.subscribe(refreshed);
    fixture.componentRef.setInput('customer', customer);
    await open();
    await fillName('My draft');
    fixture.componentRef.setInput('error', 'Revision conflict');
    fixture.componentRef.setInput('conflict', true);
    await fixture.whenStable();
    expect(document.querySelector('app-customer-form [role="alert"]')?.textContent).toContain(
      'Revision conflict',
    );
    button('Refresh the latest version and keep my draft').click();
    expect(refreshed).toHaveBeenCalledOnce();
    expect((document.querySelector('#customer-name') as HTMLInputElement).value).toBe('My draft');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(button('Cancel').disabled).toBe(true);
    expect(button('Refresh the latest version and keep my draft').disabled).toBe(true);
    fixture.debugElement
      .query(By.directive(HlmSheet))
      .triggerEventHandler('stateChanged', 'closed');
    await fixture.whenStable();
    expect(confirmation().state()).toBe('closed');
    expect(dismissed).not.toHaveBeenCalled();
  });
});
