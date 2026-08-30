import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { GateReasonDirective } from '../gate-reason.directive';

@Component({
  selector: 'app-host',
  imports: [GateReasonDirective],
  template: `<button
    type="button"
    [attr.aria-describedby]="existingDescribedBy()"
    [appGateReason]="reason()"
  ></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  public readonly reason: WritableSignal<string | null> = signal<string | null>(null);
  public readonly existingDescribedBy: WritableSignal<string | null> = signal<string | null>(null);
}

describe('GateReasonDirective', () => {
  let fixture: ComponentFixture<Host>;
  let button: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    button = fixture.nativeElement.querySelector('button');
    await fixture.whenStable();
  });

  it('stays inert when the reason is null', () => {
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('stays inert when the reason is an empty string', async () => {
    fixture.componentInstance.reason.set('');
    await fixture.whenStable();

    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('sets a stable id on aria-describedby when a reason is given', async () => {
    fixture.componentInstance.reason.set('Publish is locked until the checklist is complete.');
    await fixture.whenStable();

    const describedBy: string | null = button.getAttribute('aria-describedby');

    expect(describedBy).not.toBeNull();
    expect(describedBy).toMatch(/^gate-reason-\d+$/);
  });

  it('appends its id instead of replacing an existing aria-describedby', async () => {
    fixture.componentInstance.existingDescribedBy.set('validation-error');
    fixture.componentInstance.reason.set('Publish is locked until the checklist is complete.');
    await fixture.whenStable();

    const tokens: string[] = (button.getAttribute('aria-describedby') ?? '').split(' ');

    expect(tokens).toContain('validation-error');
    expect(tokens.length).toBe(2);
  });

  it('removes only its own id when the reason clears, keeping the rest', async () => {
    fixture.componentInstance.existingDescribedBy.set('validation-error');
    fixture.componentInstance.reason.set('Publish is locked until the checklist is complete.');
    await fixture.whenStable();

    fixture.componentInstance.reason.set(null);
    await fixture.whenStable();

    expect(button.getAttribute('aria-describedby')).toBe('validation-error');
  });

  it('removes the attribute entirely once no reason and no prior id are left', async () => {
    fixture.componentInstance.reason.set('Publish is locked until the checklist is complete.');
    await fixture.whenStable();

    fixture.componentInstance.reason.set(null);
    await fixture.whenStable();

    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('exposes reasonId matching the aria-describedby id, and null when inert', async () => {
    const directive: GateReasonDirective = fixture.debugElement
      .query((debugElement) => debugElement.nativeElement === button)
      .injector.get(GateReasonDirective);

    expect(directive.reasonId()).toBeNull();

    fixture.componentInstance.reason.set('Publish is locked until the checklist is complete.');
    await fixture.whenStable();

    expect(directive.reasonId()).toBe(button.getAttribute('aria-describedby'));

    fixture.componentInstance.reason.set(null);
    await fixture.whenStable();

    expect(directive.reasonId()).toBeNull();
  });
});
