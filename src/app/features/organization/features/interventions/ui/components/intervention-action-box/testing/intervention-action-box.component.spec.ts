import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionCommandAction,
  InterventionIssueOutput,
} from '@features/organization/features/interventions/models';
import { InterventionActionBox } from '../intervention-action-box.component';

const ACTION: InterventionCommandAction = {
  label: 'Plan intervention',
  icon: 'lucideCalendarCheck',
  disabled: false,
  disabledReason: null,
  loading: false,
};

describe('InterventionActionBox', () => {
  let fixture: ComponentFixture<InterventionActionBox>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  const create = async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionActionBox);
    fixture.componentRef.setInput('phase', 'prepare');
    await fixture.whenStable();
  };

  it('should render the action button in the prepare phase', async () => {
    await create();
    fixture.componentRef.setInput('action', ACTION);
    await fixture.whenStable();

    expect(byTestId('intervention-detail-command')?.textContent).toContain('Plan intervention');
  });

  it('should emit invoked when the action button is pressed', async () => {
    await create();
    fixture.componentRef.setInput('action', ACTION);
    await fixture.whenStable();

    let invoked = false;
    fixture.componentInstance.invoked.subscribe(() => (invoked = true));
    byTestId('intervention-detail-command')?.dispatchEvent(new Event('click'));

    expect(invoked).toBe(true);
  });

  it('should show nothing when there is no action to take', async () => {
    await create();

    expect(byTestId('intervention-detail-command')).toBeNull();
  });

  it('should show the blockers and the publication summary in the review phase', async () => {
    await create();
    fixture.componentRef.setInput('phase', 'review');
    fixture.componentRef.setInput('blockers', [
      {
        '@id': '/api/issues/1',
        '@type': 'InterventionIssue',
        severity: 'blocker',
        resource: '/api/facilities/1',
        field: null,
        message: 'Missing sign-off.',
      } as InterventionIssueOutput,
    ]);
    fixture.componentRef.setInput('pendingChanges', 2);
    fixture.componentRef.setInput('inspections', 4);
    fixture.componentRef.setInput('revision', 3);
    await fixture.whenStable();

    expect(byTestId('intervention-detail-blockers')?.textContent).toContain('Missing sign-off.');
    expect(byTestId('intervention-detail-publication-summary')?.textContent).toContain('v3');
  });

  it('should show a terminal locked state once published, with no button', async () => {
    await create();
    fixture.componentRef.setInput('phase', 'review');
    fixture.componentRef.setInput('status', 'published');
    fixture.componentRef.setInput('revision', 7);
    await fixture.whenStable();

    expect(root().textContent).toContain('v7');
    expect(byTestId('intervention-detail-command')).toBeNull();
  });
});
