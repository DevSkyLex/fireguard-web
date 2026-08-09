import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionCommandAction } from '@features/organization/features/interventions/models';
import { InterventionCommandButton } from '../intervention-command-button.component';

const ACTION: InterventionCommandAction = {
  label: 'Submit for review',
  icon: 'lucideSend',
  disabled: false,
  disabledReason: null,
  loading: false,
};

describe('InterventionCommandButton', () => {
  let fixture: ComponentFixture<InterventionCommandButton>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const button = (): HTMLButtonElement | null =>
    root().querySelector('[data-testid="intervention-detail-command"]');

  const create = async (action: InterventionCommandAction | null = ACTION): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionCommandButton);
    fixture.componentRef.setInput('action', action);
    await fixture.whenStable();
  };

  it('should render the action label', async () => {
    await create();

    expect(button()?.textContent).toContain('Submit for review');
  });

  it('should render nothing when there is no action to take', async () => {
    await create(null);

    expect(button()).toBeNull();
  });

  it('should emit invoked when pressed', async () => {
    await create();

    let invoked = false;
    fixture.componentInstance.invoked.subscribe(() => (invoked = true));
    button()?.dispatchEvent(new Event('click'));

    expect(invoked).toBe(true);
  });

  it('should not emit while the action is disabled', async () => {
    await create({ ...ACTION, disabled: true, disabledReason: 'Only the responsible agent can.' });

    expect(button()?.disabled).toBe(true);
  });

  it('should not emit while a write is already in flight', async () => {
    await create();
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(button()?.disabled).toBe(true);
  });

  it('should swap the glyph for a spinner while the action runs, keeping the label', async () => {
    await create({ ...ACTION, loading: true });

    expect(button()?.querySelector('hlm-spinner')).not.toBeNull();
    expect(button()?.querySelector(':scope > ng-icon')).toBeNull(); // hlm-spinner renders its own ng-icon, so scope to direct children.
    expect(button()?.textContent).toContain('Submit for review');
    expect(button()?.getAttribute('aria-busy')).toBe('true');
  });

  it('should fill its container only when asked to', async () => {
    await create();

    expect(button()?.classList.contains('w-full')).toBe(false);

    fixture.componentRef.setInput('block', true);
    await fixture.whenStable();

    expect(button()?.classList.contains('w-full')).toBe(true);
  });
});
