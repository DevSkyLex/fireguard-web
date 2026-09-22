import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionWorkItemOutput,
  UpdateInterventionWorkItemInput,
} from '@features/organization/features/interventions/models';
import { InterventionEffortForm } from '../intervention-effort-form.component';

/**
 * Constant item
 * @description A task whose planning and remaining effort are independent from recorded time.
 * @since 1.0.0
 */
const item: InterventionWorkItemOutput = {
  '@id': '/api/interventions/visit/work-items/task-1',
  '@type': 'InterventionWorkItem',
  id: 'task-1',
  intervention: '/api/interventions/visit',
  action: 'inspection',
  target: null,
  resultResource: null,
  assignee: '/api/organizations/org-1/members/member-1',
  source: 'planned',
  status: 'in_progress',
  required: true,
  skipReason: null,
  evidenceCount: 0,
  revision: 3,
  createdAt: '2026-09-21T09:00:00Z',
  updatedAt: '2026-09-21T09:00:00Z',
  estimatedMinutes: 180,
  remainingMinutes: 90,
  spentMinutes: 120,
  workStartsOn: '2026-09-21',
  workEndsOn: '2026-09-22',
  allowedActions: {
    canLogTime: true,
    canManageTime: false,
    canReestimate: true,
    canReassign: true,
    canEditPlanning: true,
  },
};

describe('InterventionEffortForm', () => {
  let fixture: ComponentFixture<InterventionEffortForm>;
  let writes: UpdateInterventionWorkItemInput[];
  let dirtyEvents: boolean[];

  /**
   * Function field
   * @description Locates an actual Signal Form control rather than changing the model behind its binding.
   * @access private
   * @since 1.0.0
   * @param {string} id - Native input identifier.
   * @returns {HTMLInputElement} The rendered input.
   */
  const field = (id: string): HTMLInputElement => {
    const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      `#${id}`,
    );
    if (!element) throw new Error(`Missing effort input ${id}`);
    return element;
  };

  /**
   * Function fill
   * @description Enters a user value through the input event and waits for signal form propagation.
   * @access private
   * @since 1.0.0
   * @param {string} id - Input identifier.
   * @param {string} value - Operator-entered value.
   * @returns {Promise<void>} Completion of binding updates.
   */
  const fill = async (id: string, value: string): Promise<void> => {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };

  /**
   * Function submit
   * @description Submits the native form and verifies native navigation remains prevented.
   * @access private
   * @since 1.0.0
   * @returns {Promise<void>} Completion of submit outputs.
   */
  const submit = async (): Promise<void> => {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    if (!form) throw new Error('Missing effort form');
    const event = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBe(true);
  };

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(InterventionEffortForm);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('mode', 'remaining');
    writes = [];
    dirtyEvents = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    fixture.componentInstance.dirtyChanged.subscribe((value) => dirtyEvents.push(value));
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('prefills remaining effort and submits only the reassessment without deducting recorded time', async () => {
    expect(field('effort-minutes').value).toBe('90');
    await fill('effort-minutes', '45');
    await submit();
    expect(writes).toEqual([{ remainingMinutes: 45 }]);
    expect(dirtyEvents.at(-1)).toBe(true);
  });

  it.each([
    ['', null],
    ['0', 0],
    ['2147483647', 2147483647],
  ] as const)('preserves the distinct meaning of remaining minutes %s', async (value, expected) => {
    await fill('effort-minutes', value);
    await submit();
    expect(writes).toEqual([{ remainingMinutes: expected }]);
  });

  it.each(['-1', '1.5', '1e3', 'not-a-number', '2147483648', '9007199254740992'])(
    'rejects invalid whole-minute input %s and retains the entered value',
    async (value) => {
      await fill('effort-minutes', value);
      await submit();
      expect(writes).toEqual([]);
      expect(field('effort-minutes').value).toBe(value);
      expect(fixture.nativeElement.textContent).toContain('Enter whole minutes');
    },
  );

  it('sends planning fields, independently of the task revision and time journal', async () => {
    fixture.componentRef.setInput('mode', 'planning');
    await fixture.whenStable();
    expect(field('effort-minutes').value).toBe('180');
    expect(field('effort-start').value).toBe('2026-09-21');
    expect(field('effort-end').value).toBe('2026-09-22');
    await fill('effort-minutes', '240');
    await submit();
    expect(writes).toEqual([
      {
        estimatedMinutes: 240,
        assignee: item.assignee,
        workStartsOn: '2026-09-21',
        workEndsOn: '2026-09-22',
      },
    ]);
  });

  it.each([
    ['2026-09-21', ''],
    ['', '2026-09-22'],
    ['2026-09-23', '2026-09-22'],
  ])('requires a complete chronological planning period (%s, %s)', async (from, to) => {
    fixture.componentRef.setInput('mode', 'planning');
    await fixture.whenStable();
    await fill('effort-start', from);
    await fill('effort-end', to);
    await submit();
    expect(writes).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Choose both dates in chronological order');
  });

  it('clears both date overrides to inherit the intervention period and keeps an unknown estimate null', async () => {
    fixture.componentRef.setInput('mode', 'planning');
    await fixture.whenStable();
    await fill('effort-minutes', '');
    await fill('effort-start', '');
    await fill('effort-end', '');
    fixture.componentInstance['assigneeChanged'](null);
    await submit();
    expect(writes).toEqual([
      {
        estimatedMinutes: null,
        assignee: null,
        workStartsOn: null,
        workEndsOn: null,
      },
    ]);
    expect(dirtyEvents.at(-1)).toBe(true);
  });

  it('maps the selected member identity while preserving its IRI in the command', async () => {
    fixture.componentRef.setInput('mode', 'planning');
    fixture.componentRef.setInput('members', [
      {
        value: item.assignee,
        label: 'Marie Lefèvre',
        displayName: 'Marie Lefèvre',
        roleLabel: 'Inspector',
        avatarUrl: null,
        initials: 'ML',
      },
    ]);
    await fixture.whenStable();
    expect(fixture.componentInstance['selectedMemberOption']()?.displayName).toBe('Marie Lefèvre');
    expect(fixture.componentInstance['memberLabel'](item.assignee ?? '')).toBe('Marie Lefèvre');
    expect(fixture.componentInstance['memberLabel']('former-member')).toBe('former-member');
    expect(fixture.nativeElement.textContent).toContain('Inspector');
    fixture.componentInstance['assigneeChanged']('/api/organizations/org-1/members/member-2');
    await submit();
    expect(writes[0]?.assignee).toBe('/api/organizations/org-1/members/member-2');
    fixture.componentInstance['assigneeChanged'](undefined);
    expect(fixture.componentInstance['selectedMemberOption']()).toBeNull();
  });

  it('disables duplicate submission while retaining the dirty field values', async () => {
    await fill('effort-minutes', '75');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(writes).toEqual([]);
    expect(field('effort-minutes').value).toBe('75');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLFieldSetElement>('fieldset')
        ?.disabled,
    ).toBe(true);
  });

  it('resets the baseline when selecting a different task or effort mode without inventing unknown values', async () => {
    await fill('effort-minutes', '75');
    fixture.componentRef.setInput('item', {
      ...item,
      id: 'task-2',
      estimatedMinutes: null,
      remainingMinutes: null,
      assignee: null,
      workStartsOn: null,
      workEndsOn: null,
    });
    fixture.componentRef.setInput('mode', 'planning');
    await fixture.whenStable();
    expect(field('effort-minutes').value).toBe('');
    expect(field('effort-start').value).toBe('');
    expect(field('effort-end').value).toBe('');
    expect(dirtyEvents.at(-1)).toBe(false);
  });
});
