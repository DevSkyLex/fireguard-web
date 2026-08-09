import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionCommandAction,
  InterventionIssueOutput,
} from '@features/organization/features/interventions/models';
import { InterventionCommandBar } from '../intervention-command-bar.component';

const ACTION: InterventionCommandAction = {
  label: 'Publish intervention',
  icon: 'lucideCircleCheckBig',
  disabled: false,
  disabledReason: null,
  loading: false,
};

const BLOCKER: InterventionIssueOutput = {
  resource: '/api/facilities/f-1',
  field: 'signOff',
  severity: 'blocker',
  message: 'Missing sign-off.',
} as InterventionIssueOutput;

describe('InterventionCommandBar', () => {
  let fixture: ComponentFixture<InterventionCommandBar>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const bar = (): HTMLElement => root(); // The host *is* the sticky bar — see the component's host block.

  const create = async (action: InterventionCommandAction | null = ACTION): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionCommandBar);
    fixture.componentRef.setInput('action', action);
    await fixture.whenStable();
  };

  it('should render the same command button the action box uses', async () => {
    await create();

    expect(byTestId('intervention-detail-command')?.textContent).toContain('Publish intervention');
  });

  it('should hide itself entirely when there is no action to take', async () => {
    await create(null);

    expect(byTestId('intervention-detail-command')).toBeNull();
    expect(bar().classList.contains('hidden')).toBe(true);
  });

  it('should stay out of the way from lg up, where the action box hosts the button', async () => {
    await create();

    expect(bar().classList.contains('lg:hidden')).toBe(true);
    expect(bar().classList.contains('hidden')).toBe(false);
  });

  it('should pin the host itself, so sticky travels the page and not a 57px wrapper', async () => {
    await create();

    expect(bar().classList.contains('sticky')).toBe(true);
    expect(bar().classList.contains('bottom-0')).toBe(true);
    expect(bar().className).toContain('env(safe-area-inset-bottom)');
    expect(bar().getAttribute('data-testid')).toBe('intervention-detail-command-bar');
  });

  it('should emit invoked from the button', async () => {
    await create();

    let invoked = false;
    fixture.componentInstance.invoked.subscribe(() => (invoked = true));
    byTestId('intervention-detail-command')?.dispatchEvent(new Event('click'));

    expect(invoked).toBe(true);
  });

  it('should state a plain disabled reason as text, with nothing to press', async () => {
    await create({
      ...ACTION,
      disabled: true,
      disabledReason: 'Only the responsible agent can submit.',
    });

    expect(root().textContent).toContain('Only the responsible agent can submit.');
    expect(byTestId('intervention-detail-command-bar-details')).toBeNull();
  });

  it('should point at the action box when a blocker is what disables it', async () => {
    await create({ ...ACTION, disabled: true, disabledReason: '1 blocking issue to clear.' });
    fixture.componentRef.setInput('blockers', [BLOCKER]);
    await fixture.whenStable();

    const details: HTMLElement | null = byTestId('intervention-detail-command-bar-details');

    expect(details?.textContent).toContain('1 blocking issue to clear.');

    let requested = false;
    fixture.componentInstance.detailsRequested.subscribe(() => (requested = true));
    details?.dispatchEvent(new Event('click'));

    expect(requested).toBe(true);
  });
});
