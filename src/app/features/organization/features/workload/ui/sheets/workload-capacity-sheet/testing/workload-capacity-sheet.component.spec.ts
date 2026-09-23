import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@core/request-state';
import type { CapacityOutput } from '@features/organization/features/workload/models';
import { WorkloadCapacitySheet } from '../workload-capacity-sheet.component';

const field = (id: string): HTMLInputElement => {
  const element = document.querySelector<HTMLInputElement>('#' + id);
  if (!element) throw new Error('Missing field ' + id);
  return element;
};

describe('WorkloadCapacitySheet', () => {
  afterEach(() => vi.unstubAllGlobals());
  let fixture: ComponentFixture<WorkloadCapacitySheet>;
  const configuration: CapacityOutput = {
    '@id': 'capacity',
    '@type': 'Capacity',
    organizationId: 'org',
    configuration: {
      weeks: [
        {
          id: 'org-old',
          scopeId: 'org',
          effectiveOn: '2026-01-01',
          minutes: [360, 360, 360, 360, 360, 0, 0],
        },
        {
          id: 'org-current',
          scopeId: 'org',
          effectiveOn: '2026-09-01',
          minutes: [450, 420, 420, 420, 420, 0, 0],
        },
        {
          id: 'member-current',
          scopeId: 'member',
          effectiveOn: '2026-08-01',
          minutes: [240, 240, 240, 240, 240, 0, 0],
        },
        {
          id: 'member-future',
          scopeId: 'member',
          effectiveOn: '2026-10-01',
          minutes: [0, 0, 0, 0, 0, 0, 0],
        },
      ],
      exceptions: [],
    },
  };
  const edit = async (id: string, value: string): Promise<void> => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    TestBed.configureTestingModule({ providers: [provideInteractionCapabilities()] });
    fixture = TestBed.createComponent(WorkloadCapacitySheet);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('today', '2026-09-16');
    fixture.componentRef.setInput('members', [
      {
        value: 'member',
        label: 'Alex',
        displayName: 'Alex',
        avatarUrl: null,
        initials: 'A',
        roleLabel: 'Planner',
      },
    ]);
    fixture.componentRef.setInput('readState', successCallState(configuration));
    fixture.componentRef.setInput('writeState', idleCallState());
    await fixture.whenStable();
  });

  it('prefills the latest effective organization week and associates the footer submit with the form', () => {
    expect(field('capacity-day-0-hours').value).toBe('7');
    expect(field('capacity-day-0-minutes').value).toBe('30');
    expect(document.querySelector('#capacity-effective-on')?.textContent).toContain('Sep 16, 2026');
    const submit = document.querySelector<HTMLButtonElement>(
      'button[form="workload-capacity-form"]',
    );
    expect(submit?.form?.id).toBe('workload-capacity-form');
    expect(submit?.disabled).toBe(false);
    expect(document.querySelectorAll('hlm-field-error')).toHaveLength(0);
  });

  it('uses the effective individual week instead of a newer organization week or future override', async () => {
    fixture.componentRef.setInput('initialMemberId', 'member');
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('4');
    expect(field('capacity-day-0-minutes').value).toBe('0');
    const picker = field('capacity-scope').closest('[data-slot="input-group"]');
    expect(picker?.textContent).toContain('Planner');
    expect(picker?.querySelector('hlm-avatar')?.textContent).toContain('A');
    expect(field('capacity-scope').value).toBe('Alex');
  });

  it('falls back to the organization week for a member without an override', async () => {
    fixture.componentRef.setInput('initialMemberId', 'other');
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('7');
    expect(document.querySelector('hlm-sheet-content')?.textContent).toContain(
      'Prefilled from the organization default',
    );
  });

  it('resets a draft only after confirmation and keeps the sheet open', async () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await edit('capacity-day-0-hours', '6');
    Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Reset changes')
      ?.click();
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('6');
    document.querySelector<HTMLButtonElement>('[data-testid="unsaved-changes-discard"]')?.click();
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('7');
    expect(field('capacity-scope').disabled).toBe(false);
    expect(closed).not.toHaveBeenCalled();
  });

  it('shows saved exceptions outside the collapsed weekly history', async () => {
    fixture.componentRef.setInput('initialMemberId', 'member');
    fixture.componentRef.setInput(
      'readState',
      successCallState({
        ...configuration,
        configuration: {
          ...configuration.configuration,
          exceptions: [
            {
              id: 'absence',
              memberId: 'member',
              startsOn: '2026-09-17',
              endsOn: '2026-09-18',
              minutes: 0,
            },
          ],
        },
      }),
    );
    await fixture.whenStable();
    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Cancel exception',
    );
    expect(cancel).toBeDefined();
    expect(cancel?.closest('[hlmCollapsibleContent]')).toBeNull();
    expect(document.querySelector('hlm-sheet-content')?.textContent).toContain(
      'Saved availability exceptions',
    );
  });

  it('does not invent an all-zero week when only future capacity exists', async () => {
    fixture.componentRef.setInput(
      'readState',
      successCallState({
        ...configuration,
        configuration: { weeks: [configuration.configuration.weeks[3]], exceptions: [] },
      }),
    );
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('');
  });

  it('keeps edited hours through a failed write and asks before discarding', async () => {
    await edit('capacity-day-0-hours', '6');
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();
    expect(
      document.querySelector<HTMLButtonElement>('button[form="workload-capacity-form"]')?.disabled,
    ).toBe(true);
    fixture.componentRef.setInput('writeState', errorCallState({ message: 'Save failed' }));
    await fixture.whenStable();
    expect(field('capacity-day-0-hours').value).toBe('6');
    const cancel = Array.from(
      document.querySelectorAll<HTMLButtonElement>('hlm-sheet-footer button'),
    ).find((button) => button.textContent?.trim() === 'Cancel');
    cancel?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="unsaved-changes-dialog"]')).not.toBeNull();
  });

  it('emits the integer-minute payload from the footer and disables writes offline', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    document.querySelector<HTMLButtonElement>('button[form="workload-capacity-form"]')?.click();
    await fixture.whenStable();
    expect(submitted).toHaveBeenCalledWith({
      kind: 'week',
      organizationId: 'org',
      memberId: null,
      input: { effectiveOn: '2026-09-16', minutes: [450, 420, 420, 420, 420, 0, 0] },
    });
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();
    expect(
      document.querySelector<HTMLButtonElement>('button[form="workload-capacity-form"]')?.disabled,
    ).toBe(true);
  });

  it('keeps the current member and workflow while a draft or write is in progress', async () => {
    await edit('capacity-day-0-hours', '6');
    fixture.componentInstance['setScope']('member');
    fixture.componentInstance['setMode']('exception');

    expect(fixture.componentInstance['memberId']()).toBeNull();
    expect(fixture.componentInstance['mode']()).toBe('week');

    fixture.componentInstance['dirty'].set(false);
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();
    fixture.componentInstance['setScope']('member');
    fixture.componentInstance['setMode']('exception');

    expect(fixture.componentInstance['memberId']()).toBeNull();
    expect(fixture.componentInstance['mode']()).toBe('week');

    fixture.componentRef.setInput('writeState', idleCallState());
    await fixture.whenStable();
    fixture.componentInstance['setScope']('member');
    fixture.componentInstance['setMode']('exception');
    await fixture.whenStable();

    expect(fixture.componentInstance['memberId']()).toBe('member');
    expect(fixture.componentInstance['mode']()).toBe('exception');
  });

  it('does not close a pending write and closes a clean sheet immediately', async () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    expect(closed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('writeState', idleCallState());
    await fixture.whenStable();
    fixture.componentInstance['requestClose']();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('submits an availability exception only for an online member without a pending write', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const exception = { startsOn: '2026-09-17', endsOn: '2026-09-18', minutes: 120 };

    fixture.componentInstance['saveException'](exception);
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentRef.setInput('initialMemberId', 'member');
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();
    fixture.componentInstance['saveException'](exception);
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentRef.setInput('online', true);
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();
    fixture.componentInstance['saveException'](exception);
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentRef.setInput('writeState', idleCallState());
    await fixture.whenStable();
    fixture.componentInstance['saveException'](exception);
    expect(submitted).toHaveBeenCalledExactlyOnceWith({
      kind: 'exception',
      organizationId: 'org',
      memberId: 'member',
      input: exception,
    });
  });

  it('cancels only the confirmed exception and clears its pending identifier', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentRef.setInput('initialMemberId', 'member');
    await fixture.whenStable();

    fixture.componentInstance['confirmCancellation']();
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentInstance['cancelExceptionId'].set('absence');
    fixture.componentInstance['confirmCancellation']();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({
      kind: 'cancel',
      organizationId: 'org',
      memberId: 'member',
      exceptionId: 'absence',
    });
    expect(fixture.componentInstance['cancelExceptionId']()).toBeNull();
  });
});
