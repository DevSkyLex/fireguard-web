import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InplaceField } from '../inplace-field.component';

@Component({
  imports: [InplaceField],
  template: `
    <app-inplace-field
      [label]="label()"
      [display]="display()"
      [editable]="editable()"
      [pending]="pending()"
      [error]="error()"
      (opened)="opened = opened + 1"
      (saved)="saved = saved + 1"
      (cancelled)="cancelled = cancelled + 1"
    >
      <input editor data-testid="editor" />
    </app-inplace-field>
  `,
})
class HostComponent {
  public readonly label: WritableSignal<string> = signal<string>('Address');
  public readonly display: WritableSignal<string | null> = signal<string | null>('12 rue Nord');
  public readonly editable: WritableSignal<boolean> = signal<boolean>(true);
  public readonly pending: WritableSignal<boolean> = signal<boolean>(false);
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);

  public opened = 0;
  public saved = 0;
  public cancelled = 0;
}

describe('InplaceField', () => {
  let fixture: ComponentFixture<HostComponent>;

  const render = (): ComponentFixture<HostComponent> => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    return fixture;
  };

  const open = (): void => {
    fixture.debugElement.query(By.css('.p-inplace-display')).nativeElement.click();
    fixture.detectChanges();
  };

  const buttonLabelled = (text: string): HTMLElement | undefined =>
    fixture.debugElement
      .queryAll(By.css('button'))
      .map((debugElement) => debugElement.nativeElement as HTMLElement)
      .find((element) => (element.textContent ?? '').includes(text));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('should render the value and its label while closed', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain('Address');
    expect(fixture.nativeElement.textContent).toContain('12 rue Nord');
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).toBeNull();
  });

  it('should fall back to the empty label when the value is unset', () => {
    render();
    fixture.componentInstance.display.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Not provided');
  });

  it('should announce what activating the field does, not only its value', () => {
    render();

    const display = fixture.debugElement.query(By.css('.p-inplace-display span'));

    expect(display.nativeElement.getAttribute('aria-label')).toBe('Edit Address');
  });

  it('should project the editor and report the opening so the host can seed it', () => {
    render();
    open();

    expect(fixture.componentInstance.opened).toBe(1);
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).not.toBeNull();
  });

  it('should ask the host to persist without closing itself, since only the host knows it landed', () => {
    render();
    open();

    buttonLabelled('Save')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.saved).toBe(1);
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).not.toBeNull();
  });

  it('should close and report a cancel', () => {
    render();
    open();

    buttonLabelled('Cancel')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.cancelled).toBe(1);
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).toBeNull();
  });

  it('should cancel on Escape, the path a keyboard user reaches for first', () => {
    render();
    open();

    fixture.debugElement
      .query(By.css('p-inplace'))
      .triggerEventHandler('keydown.escape', new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.cancelled).toBe(1);
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).toBeNull();
  });

  it('should show the failure under the control and stay open so it can be corrected', () => {
    render();
    open();

    fixture.componentInstance.error.set('Address is too long.');
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('[role="alert"]'));

    expect(alert.nativeElement.textContent).toContain('Address is too long.');
    expect(fixture.debugElement.query(By.css('[data-testid="editor"]'))).not.toBeNull();
  });

  it('should lock the cancel affordance while a save is in flight', () => {
    render();
    open();

    fixture.componentInstance.pending.set(true);
    fixture.detectChanges();

    expect((buttonLabelled('Cancel') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should render a read-only property as plain text, with no affordance to refuse', () => {
    render();
    fixture.componentInstance.editable.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-inplace'))).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('12 rue Nord');
  });
});
