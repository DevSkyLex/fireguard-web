import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionIssueOutput,
  InterventionIssueTarget,
} from '@features/organization/features/interventions/models';
import { InterventionIssuesChecklist } from '../intervention-issues-checklist.component';

function issue(
  id: string,
  severity: InterventionIssueOutput['severity'],
  resource: string,
  field: string | null,
  message: string,
): InterventionIssueOutput {
  return { '@id': id, '@type': 'InterventionIssue', severity, resource, field, message };
}

describe('InterventionIssuesChecklist', () => {
  let fixture: ComponentFixture<InterventionIssuesChecklist>;
  let activated: InterventionIssueTarget[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const blockerItems = (): HTMLButtonElement[] =>
    Array.from(
      root().querySelectorAll('[data-testid="intervention-issues-checklist-blocker-item"]'),
    );
  const secondaryItems = (): HTMLButtonElement[] =>
    Array.from(
      root().querySelectorAll('[data-testid="intervention-issues-checklist-secondary-item"]'),
    );
  const clearNotice = (): HTMLElement | null =>
    root().querySelector('[data-testid="intervention-issues-checklist-clear"]');
  const secondaryToggle = (): HTMLButtonElement | null =>
    root().querySelector('[data-testid="intervention-issues-checklist-secondary-toggle"]');

  async function setup(
    issues: readonly InterventionIssueOutput[],
    phase: 'prepare' | 'execute' | 'review' = 'execute',
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionIssuesChecklist);
    fixture.componentRef.setInput('issues', issues);
    fixture.componentRef.setInput('phase', phase);
    await fixture.whenStable();

    activated = [];
    fixture.componentInstance.activated.subscribe((target) => activated.push(target));
  }

  const blocker = issue(
    '/api/equipment/1',
    'blocker',
    '/api/equipment/1',
    'facility',
    'Equipment must be assigned to a facility.',
  );
  const warning = issue(
    '/api/interventions/abc',
    'warning',
    '/api/interventions/abc',
    null,
    'No equipment has been inventoried yet.',
  );
  const recommendation = issue(
    '/api/equipment/2',
    'recommendation',
    '/api/equipment/2',
    'serialNumber',
    'Add a serial number to improve traceability.',
  );

  it('should render blockers first, unfolded, before warnings and recommendations', async () => {
    await setup([warning, blocker, recommendation]);

    expect(blockerItems()).toHaveLength(1);
    expect(blockerItems()[0]?.textContent).toContain('Equipment must be assigned to a facility.');
    expect(secondaryToggle()).not.toBeNull();
    expect(secondaryToggle()?.textContent).toContain('2');
  });

  it('should keep warnings and recommendations collapsed until expanded', async () => {
    await setup([blocker, warning, recommendation]);

    const content = root().querySelector('[data-slot="collapsible-content"]');

    expect(content?.getAttribute('data-state')).toBe('closed');

    secondaryToggle()?.click();
    await fixture.whenStable();

    expect(content?.getAttribute('data-state')).toBe('open');
  });

  it('should emit the resolved target when a blocker is activated', async () => {
    await setup([blocker]);

    blockerItems()[0]?.click();

    expect(activated).toEqual([{ kind: 'railTab', tab: 'equipment' }]);
  });

  it('should emit the resolved target when a secondary issue is activated', async () => {
    await setup([blocker, warning]);
    secondaryToggle()?.click();
    await fixture.whenStable();

    secondaryItems()[0]?.click();

    expect(activated).toEqual([{ kind: 'workItems' }]);
  });

  it('should show the positive line only under review with no blockers', async () => {
    await setup([], 'review');
    expect(clearNotice()).toBeNull();
    fixture.componentRef.setInput('verified', true);
    await fixture.whenStable();
    expect(clearNotice()).not.toBeNull();
    expect(clearNotice()?.textContent).toContain('No blocking issues detected');
  });

  it('should not show the positive line outside the review phase', async () => {
    await setup([], 'execute');

    expect(clearNotice()).toBeNull();
  });

  it('should not show the positive line under review while a blocker remains', async () => {
    await setup([blocker], 'review');

    expect(clearNotice()).toBeNull();
  });

  it('should render nothing when there are no issues and the phase is not review', async () => {
    await setup([], 'execute');

    expect(root().querySelector('[data-testid="intervention-issues-checklist"]')).toBeNull();
  });
});
