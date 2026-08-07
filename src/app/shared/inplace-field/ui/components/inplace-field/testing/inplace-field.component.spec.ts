import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InplaceField } from '../inplace-field.component';

@Component({
  selector: 'app-inplace-field-host',
  imports: [InplaceField],
  template: `
    <app-inplace-field
      [label]="label()"
      [editable]="editable()"
      [editing]="editing()"
      [commit]="commit()"
      [pending]="pending()"
      [error]="error()"
      [canSave]="canSave()"
      [orientation]="orientation()"
      (editingChange)="editingChanges.push($event)"
      (saved)="savedCount = savedCount + 1"
      (cancelled)="cancelledCount = cancelledCount + 1"
    >
      <span fieldValue>Warehouse B</span>
      <input fieldEditor data-testid="editor-control" />
    </app-inplace-field>
  `,
})
class InplaceFieldHost {
  public readonly label: WritableSignal<string> = signal('Site');
  public readonly editable: WritableSignal<boolean> = signal(true);
  public readonly editing: WritableSignal<boolean> = signal(false);
  public readonly commit: WritableSignal<'pick' | 'confirm'> = signal<'pick' | 'confirm'>(
    'confirm',
  );
  public readonly pending: WritableSignal<boolean> = signal(false);
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);
  public readonly canSave: WritableSignal<boolean> = signal(true);
  public readonly orientation: WritableSignal<'horizontal' | 'vertical'> = signal<
    'horizontal' | 'vertical'
  >('horizontal');

  public readonly editingChanges: boolean[] = [];
  public savedCount: number = 0;
  public cancelledCount: number = 0;
}

describe('InplaceField', () => {
  let fixture: ComponentFixture<InplaceFieldHost>;
  let host: InplaceFieldHost;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement =>
    root().querySelector('button[aria-controls], button[disabled]') as HTMLButtonElement;
  const buttonLabelled = (text: string): HTMLButtonElement | undefined =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.trim().startsWith(text),
    );
  const control = (): HTMLElement =>
    root().querySelector('[data-testid="editor-control"]') as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InplaceFieldHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should render the label and the projected value at rest', () => {
    expect(root().textContent).toContain('Site');
    expect(root().textContent).toContain('Warehouse B');
  });

  it('should not render the editor while closed', () => {
    expect(control()).toBeNull();
  });

  it('should ask the host to open when the trigger is activated', () => {
    trigger().click();

    expect(host.editingChanges).toEqual([true]);
  });

  it('should expose the disclosure relationship on the trigger', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-controls')).toBeTruthy();
  });

  it('should disable the trigger and drop its disclosure semantics when not editable', async () => {
    host.editable.set(false);
    await fixture.whenStable();

    expect(trigger().disabled).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBeNull();
    expect(root().querySelector('ng-icon')).toBeNull();
  });

  it('should render the projected control once open', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    expect(control()).not.toBeNull();
  });

  it('should move focus into the editor when it opens', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    expect(document.activeElement).toBe(control());
  });

  it('should offer Save and Cancel in confirm mode', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    expect(buttonLabelled('Save')).toBeDefined();
    expect(buttonLabelled('Cancel')).toBeDefined();
  });

  it('should offer no Save in pick mode, where the selection is the commit', async () => {
    host.commit.set('pick');
    host.editing.set(true);
    await fixture.whenStable();

    expect(buttonLabelled('Save')).toBeUndefined();
    expect(buttonLabelled('Cancel')).toBeUndefined();
  });

  it('should emit saved without closing itself — only the host knows the call succeeded', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    buttonLabelled('Save')?.click();

    expect(host.savedCount).toBe(1);
    expect(host.editingChanges).toEqual([]);
  });

  it('should disable Save while a write is in flight', async () => {
    host.editing.set(true);
    host.pending.set(true);
    await fixture.whenStable();

    expect(buttonLabelled('Save')?.disabled).toBe(true);
    expect(buttonLabelled('Cancel')?.disabled).toBe(true);
  });

  it('should disable Save when the draft cannot be committed', async () => {
    host.editing.set(true);
    host.canSave.set(false);
    await fixture.whenStable();

    expect(buttonLabelled('Save')?.disabled).toBe(true);
  });

  it('should cancel and close when Cancel is activated', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    buttonLabelled('Cancel')?.click();

    expect(host.cancelledCount).toBe(1);
    expect(host.editingChanges).toEqual([false]);
  });

  it('should cancel on Escape', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    control().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(host.cancelledCount).toBe(1);
    expect(host.editingChanges).toEqual([false]);
  });

  it('should leave an Escape already consumed by the control to the control', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    const consumed: KeyboardEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    consumed.preventDefault();
    control().dispatchEvent(consumed);

    expect(host.cancelledCount).toBe(0);
    expect(host.editingChanges).toEqual([]);
  });

  it('should refuse to cancel while the write is in flight', async () => {
    host.editing.set(true);
    host.pending.set(true);
    await fixture.whenStable();

    control().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(host.editingChanges).toEqual([]);
  });

  it('should announce a rejected write in place and keep the editor open', async () => {
    host.editing.set(true);
    host.error.set('The site could not be saved.');
    await fixture.whenStable();

    const alert: HTMLElement = root().querySelector('[role="alert"]') as HTMLElement;

    expect(alert.textContent).toContain('The site could not be saved.');
    expect(control()).not.toBeNull();
  });

  it('should reserve a fixed label column when fields must line up', () => {
    const label: HTMLElement = trigger().firstElementChild as HTMLElement;

    expect(label.className).toContain('w-24');
    expect(trigger().className).toContain('items-center');
  });

  it('should give the value the whole width when the field is already framed', async () => {
    // A card provides the framing, so a fixed label column only truncates the value.
    host.orientation.set('vertical');
    await fixture.whenStable();

    const label: HTMLElement = trigger().firstElementChild as HTMLElement;

    expect(label.className).not.toContain('w-24');
    expect(trigger().className).toContain('flex-col');
  });

  it('should return focus to the trigger when the field closes', async () => {
    host.editing.set(true);
    await fixture.whenStable();

    (document.activeElement as HTMLElement).blur();
    host.editing.set(false);
    await fixture.whenStable();

    expect(document.activeElement).toBe(trigger());
  });
});
