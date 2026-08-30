import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionCommandAction } from '@features/organization/features/interventions/models';
import { InterventionStatusBand } from '../intervention-status-band.component';

const ACTION: InterventionCommandAction = {
  label: 'Plan intervention',
  icon: 'lucideCalendarCheck',
  disabled: false,
  disabledReason: null,
  loading: false,
};

describe('InterventionStatusBand', () => {
  let fixture: ComponentFixture<InterventionStatusBand>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  const create = async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionStatusBand);
    fixture.componentRef.setInput('status', 'in_progress');
    fixture.componentRef.setInput('phase', 'execute');
    await fixture.whenStable();
  };

  it('should render the status tag and the phase label', async () => {
    await create();

    expect(root().textContent).toContain('In progress');
    expect(root().textContent).toContain('Field work');
  });

  it('should wire the command button and re-emit invoked', async () => {
    await create();
    fixture.componentRef.setInput('action', ACTION);
    await fixture.whenStable();

    let invoked = false;
    fixture.componentInstance.invoked.subscribe(() => (invoked = true));
    byTestId('intervention-detail-command')?.dispatchEvent(new Event('click'));

    expect(invoked).toBe(true);
  });

  it('should show the disabled reason beneath the command', async () => {
    await create();
    fixture.componentRef.setInput('action', {
      ...ACTION,
      disabled: true,
      disabledReason: 'Only the responsible agent can plan this.',
    });
    await fixture.whenStable();

    expect(root().textContent).toContain('Only the responsible agent can plan this.');
  });

  it('should hide the blockers control when there are none', async () => {
    await create();

    expect(byTestId('intervention-detail-blockers')).toBeNull();
  });

  it('should show the blockers control with its count and emit blockersRequested', async () => {
    await create();
    fixture.componentRef.setInput('blockersCount', 3);
    await fixture.whenStable();

    const blockers: HTMLElement | null = byTestId('intervention-detail-blockers');
    expect(blockers?.textContent).toContain('3');

    let requested = false;
    fixture.componentInstance.blockersRequested.subscribe(() => (requested = true));
    blockers?.dispatchEvent(new Event('click'));

    expect(requested).toBe(true);
  });

  it('should replace the command with the published terminal line', async () => {
    await create();
    fixture.componentRef.setInput('status', 'published');
    fixture.componentRef.setInput('action', ACTION);
    fixture.componentRef.setInput('revision', 5);
    await fixture.whenStable();

    expect(root().textContent).toContain('v5');
    expect(byTestId('intervention-detail-command')).toBeNull();
  });

  it('should not render a review note — it moved to the detail page content, out of the fixed bottom bar', async () => {
    await create();
    fixture.componentRef.setInput('status', 'changes_requested');
    await fixture.whenStable();

    expect(byTestId('intervention-detail-review-note')).toBeNull();
  });
});
