import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnCombobox } from '@spartan-ng/brain/combobox';
import { BrnSelect } from '@spartan-ng/brain/select';
import { errorCallState, pendingCallState, type StoreError } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  CreateMaintenancePlanInput,
  MaintenancePlanOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { HlmCombobox } from '@shared/ui/combobox';
import { HlmSelect } from '@shared/ui/select';
import { MaintenancePlanForm } from '../maintenance-plan-form.component';

describe('MaintenancePlanForm', () => {
  let fixture: ComponentFixture<MaintenancePlanForm>;
  let submissions: CreateMaintenancePlanInput[];
  let cancellations: ReturnType<typeof vi.fn<() => void>>;
  const rejected: StoreError = {
    error: null,
    message: 'Rejected',
    code: 422,
    retryable: false,
    timestamp: Date.UTC(2026, 9, 9),
  };
  const equipmentId = '019bd877-9628-756a-a6ea-e0ea1b025702';
  const organizationId = '019bd877-9628-756a-a6ea-e0ea1b025701';
  const plan: MaintenancePlanOutput = {
    '@id':
      '/api/organizations/' +
      organizationId +
      '/maintenance/plans/019bd877-9628-756a-a6ea-e0ea1b025703',
    '@type': 'MaintenancePlan',
    id: '019bd877-9628-756a-a6ea-e0ea1b025703',
    organizationId,
    equipmentId,
    equipmentType: 'fire_extinguisher',
    name: 'Monthly maintenance',
    operationKind: 'maintenance',
    interval: 'P1M',
    cadenceMode: 'fixed',
    calendarTimezone: 'Europe/Paris',
    anchorAt: '2027-01-31T00:00:00+01:00',
    nextDueAt: '2027-02-28T00:00:00+01:00',
    active: true,
    openOccurrence: null,
  };
  const equipment: EquipmentOutput = {
    '@id': '/api/organizations/' + organizationId + '/equipment/' + equipmentId,
    '@type': 'Equipment',
    id: equipmentId,
    organizationId,
    name: 'Workshop extinguisher',
    facilityId: null,
    type: 'fire_extinguisher',
    subType: null,
    brand: null,
    model: null,
    serialNumber: null,
    locationLabel: null,
    facilityName: null,
    status: 'operational',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  /**
   * Function root
   *
   * @description
   * Provides the rendered form boundary for assertions and native input events.
   *
   * @returns {HTMLElement} Current fixture host.
   */
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  /**
   * Function input
   *
   * @description
   * Resolves a required native control by its public label target.
   *
   * @param {string} id - Native control identifier.
   *
   * @returns {HTMLInputElement} Rendered control.
   */
  const input = (id: string): HTMLInputElement => {
    const control = root().querySelector<HTMLInputElement>('#' + id);
    if (!control) throw new Error('Missing input ' + id);
    return control;
  };

  /**
   * Function setValue
   *
   * @description
   * Enters a value through the control's native input event.
   *
   * @param {string} id - Native control identifier.
   * @param {string} value - User-entered value.
   *
   * @returns {Promise<void>} Resolves once field state settles.
   */
  const setValue = async (id: string, value: string): Promise<void> => {
    const control = input(id);
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };

  /**
   * Function selectValue
   *
   * @description
   * Selects an option through the installed control's public selection API.
   *
   * @param {number} index - Select position in DOM order.
   * @param {string} value - Authorized option value.
   *
   * @returns {Promise<void>} Resolves once the selection settles.
   */
  const selectValue = async (index: number, value: string): Promise<void> => {
    const selected = fixture.debugElement.queryAll(By.directive(HlmSelect))[index];
    selected.injector.get<BrnSelect<string>>(BrnSelect).select(value);
    await fixture.whenStable();
  };

  /**
   * Function prepareDraft
   *
   * @description
   * Prepares a valid new operation through public controls without choosing a server deadline.
   *
   * @param {string} unit - Explicit calendar unit.
   *
   * @returns {Promise<void>} Resolves once all draft fields settle.
   */
  const prepareDraft = async (unit = 'M'): Promise<void> => {
    fixture.componentRef.setInput('equipment', [equipment]);
    await fixture.whenStable();
    fixture.debugElement
      .query(By.directive(HlmCombobox))
      .injector.get<BrnCombobox<string>>(BrnCombobox)
      .select(equipmentId);
    await fixture.whenStable();
    await setValue('maintenance-plan-name', '  Service  ');
    await selectValue(0, 'maintenance');
    await setValue('maintenance-plan-every', '2');
    await selectValue(1, unit);
    await setValue('maintenance-plan-anchor', '2026-01-31');
  };

  /**
   * Function submit
   *
   * @description
   * Dispatches native submission so validation and emitted intent remain observable.
   *
   * @returns {Promise<void>} Resolves once submission feedback settles.
   */
  const submit = async (): Promise<void> => {
    const form = root().querySelector('form');
    if (!form) throw new Error('Missing maintenance plan form');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await fixture.whenStable();
  };

  /**
   * Function button
   *
   * @description
   * Resolves an action by its user-visible label.
   *
   * @param {string} label - Rendered action label.
   *
   * @returns {HTMLButtonElement} Matching action.
   */
  const button = (label: string): HTMLButtonElement => {
    const action = [...root().querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    if (!action) throw new Error('Missing button ' + label);
    return action;
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [MaintenancePlanForm] });
    fixture = TestBed.createComponent(MaintenancePlanForm);
    submissions = [];
    cancellations = vi.fn<() => void>();
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(cancellations);
    await fixture.whenStable();
  });

  it('requires explicit equipment, unit, name and anchor before preparation', async () => {
    await submit();
    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Select an equipment.');
    expect(root().textContent).toContain('Choose a calendar unit.');
    expect(root().textContent).toContain('Enter an operation name.');
    expect(root().textContent).toContain('Choose an anchor date.');
  });

  it.each(['D', 'W', 'M', 'Y'])(
    'emits explicitly selected unit %s and leaves future dates to the server',
    async (unit) => {
      await prepareDraft(unit);
      await submit();
      expect(submissions).toEqual([
        {
          equipmentId,
          name: 'Service',
          operationKind: 'maintenance',
          interval: 'P2' + unit,
          anchorOn: '2026-01-31',
        },
      ]);
    },
  );

  it('includes an explicit first deadline without calculating calendar recurrence', async () => {
    await prepareDraft();
    await setValue('maintenance-plan-first-due', '2026-03-20');
    await submit();
    expect(submissions).toEqual([
      {
        equipmentId,
        name: 'Service',
        operationKind: 'maintenance',
        interval: 'P2M',
        anchorOn: '2026-01-31',
        nextDueOn: '2026-03-20',
      },
    ]);
  });

  it.each([
    ['0', 'Enter a positive interval.'],
    ['1.5', 'Enter a whole number.'],
  ])('refuses cadence %s with actionable validation', async (value, message) => {
    await prepareDraft();
    await setValue('maintenance-plan-every', value);
    await submit();
    expect(submissions).toEqual([]);
    expect(root().textContent).toContain(message);
  });

  it('refuses an overlong name and permits correction within the same draft', async () => {
    await prepareDraft();
    await setValue('maintenance-plan-name', 'A'.repeat(161));
    await submit();
    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Use at most 160 characters.');
    await setValue('maintenance-plan-name', 'Corrected service');
    await submit();
    expect(submissions[0]?.name).toBe('Corrected service');
  });

  it('preserves rejected values and permits a corrected resubmission', async () => {
    await prepareDraft();
    await setValue('maintenance-plan-first-due', '2026-04-01');
    await submit();
    fixture.componentRef.setInput('serverError', rejected);
    await fixture.whenStable();
    expect(input('maintenance-plan-name').value).toBe('  Service  ');
    expect(input('maintenance-plan-first-due').value).toBe('2026-04-01');
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('Rejected');
    await setValue('maintenance-plan-name', 'Corrected annual check');
    fixture.componentRef.setInput('serverError', null);
    await fixture.whenStable();
    await submit();
    expect(submissions[1]).toEqual({
      equipmentId,
      name: 'Corrected annual check',
      operationKind: 'maintenance',
      interval: 'P2M',
      anchorOn: '2026-01-31',
      nextDueOn: '2026-04-01',
    });
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('renders a fallback save error when the server provides no message', async () => {
    fixture.componentRef.setInput('serverError', {
      ...rejected,
      message: null,
    } satisfies StoreError);
    await fixture.whenStable();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      'The plan could not be saved.',
    );
  });

  it('locks pending controls and cancellation, then restores the same rejected draft', async () => {
    await prepareDraft();
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    for (const id of [
      'maintenance-plan-name',
      'maintenance-plan-every',
      'maintenance-plan-anchor',
      'maintenance-plan-first-due',
    ]) {
      expect(input(id).disabled).toBe(true);
    }
    expect(button('Cancel').disabled).toBe(true);
    const save = button('Save and preview dates');
    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-busy')).toBe('true');
    button('Cancel').click();
    await submit();
    expect(cancellations).not.toHaveBeenCalled();
    expect(submissions).toEqual([]);
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('serverError', {
      ...rejected,
      message: 'Try again',
    } satisfies StoreError);
    await fixture.whenStable();
    expect(input('maintenance-plan-name').value).toBe('  Service  ');
    expect(input('maintenance-plan-name').disabled).toBe(false);
    expect(button('Save and preview dates').getAttribute('aria-busy')).toBeNull();
    button('Cancel').click();
    expect(cancellations).toHaveBeenCalledOnce();
  });

  it.each(['2027-01-31T00:00:00+01:00', null])(
    'locks an open calendar and permits renaming with historical anchor %s',
    async (anchorAt) => {
      fixture.componentRef.setInput('initialPlan', {
        ...plan,
        cadenceMode: anchorAt ? 'fixed' : 'legacy',
        anchorAt,
        openOccurrence: {
          id: '019bd877-9628-756a-a6ea-e0ea1b025704',
          dueAt: '2027-02-28T00:00:00+01:00',
          attempt: 1,
          status: 'open',
        },
      } satisfies MaintenancePlanOutput);
      await fixture.whenStable();
      expect(input('maintenance-plan-every').disabled).toBe(true);
      expect(root().querySelector<HTMLButtonElement>('#maintenance-plan-unit')?.disabled).toBe(
        true,
      );
      expect(input('maintenance-plan-anchor').disabled).toBe(true);
      expect(input('maintenance-plan-first-due').disabled).toBe(true);
      expect(input('maintenance-plan-name').disabled).toBe(false);
      expect(root().querySelector('#maintenance-plan-equipment')).toBeNull();
      expect(root().querySelector('#maintenance-plan-kind')).toBeNull();
      expect(
        root().querySelector('[data-testid="maintenance-plan-calendar-locked"]')?.textContent,
      ).toContain('You can still change the operation name.');
      await setValue('maintenance-plan-name', 'Renamed maintenance');
      await submit();
      expect(submissions).toEqual([
        {
          equipmentId,
          name: 'Renamed maintenance',
          operationKind: 'maintenance',
          interval: 'P1M',
          anchorOn: anchorAt ? '2027-01-31' : '',
          nextDueOn: '2027-02-28',
        },
      ]);
    },
  );

  it('adopts another selected plan and permits editing an unlocked calendar', async () => {
    fixture.componentRef.setInput('initialPlan', plan);
    await fixture.whenStable();
    await setValue('maintenance-plan-name', 'Unsaved rename');
    fixture.componentRef.setInput('initialPlan', {
      ...plan,
      id: '019bd877-9628-756a-a6ea-e0ea1b025705',
      name: 'Weekly control',
      operationKind: 'control',
      interval: 'P3W',
      anchorAt: '2027-03-02T00:00:00Z',
      nextDueAt: null,
    } satisfies MaintenancePlanOutput);
    await fixture.whenStable();
    expect(input('maintenance-plan-name').value).toBe('Weekly control');
    expect(input('maintenance-plan-every').value).toBe('3');
    expect(input('maintenance-plan-anchor').value).toBe('2027-03-02');
    expect(input('maintenance-plan-first-due').value).toBe('');
    expect(input('maintenance-plan-anchor').disabled).toBe(false);
    await setValue('maintenance-plan-anchor', '2027-03-03');
    await submit();
    expect(submissions[0]).toEqual({
      equipmentId,
      name: 'Weekly control',
      operationKind: 'control',
      interval: 'P3W',
      anchorOn: '2027-03-03',
    });
  });

  it('retains a selected equipment label across server option pages', async () => {
    await prepareDraft();
    fixture.componentRef.setInput('equipment', []);
    await fixture.whenStable();
    expect(input('maintenance-plan-equipment').value).toContain('Workshop extinguisher');
    await submit();
    expect(submissions[0]?.equipmentId).toBe(equipmentId);
  });

  it('exposes loading, retry and bounded server paging through public outputs', async () => {
    const pages: number[] = [];
    fixture.componentInstance.equipmentPageChanged.subscribe((value) => pages.push(value));
    fixture.componentRef.setInput('equipmentState', pendingCallState<readonly EquipmentOutput[]>());
    fixture.componentRef.setInput('equipmentPageCount', 3);
    await fixture.whenStable();
    expect(root().textContent).toContain('Loading equipment');
    expect(button('Previous equipment').disabled).toBe(true);
    button('Next equipment').click();
    expect(pages).toEqual([2]);
    fixture.componentRef.setInput('equipmentPage', 3);
    fixture.componentRef.setInput(
      'equipmentState',
      errorCallState<readonly EquipmentOutput[]>({
        ...rejected,
        code: 503,
        message: 'Search unavailable',
        retryable: true,
      }),
    );
    await fixture.whenStable();
    expect(button('Next equipment').disabled).toBe(true);
    expect(root().textContent).toContain('Search unavailable');
    button('Previous equipment').click();
    button('Retry').click();
    expect(pages).toEqual([2, 2, 3]);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(button('Previous equipment').disabled).toBe(true);
    expect(button('Next equipment').disabled).toBe(true);
  });

  it('forwards equipment search text for the owner to query', async () => {
    const searches: string[] = [];
    fixture.componentInstance.equipmentSearched.subscribe((value) => searches.push(value));
    await setValue('maintenance-plan-equipment', 'Workshop');
    expect(searches).toContain('Workshop');
    expect(submissions).toEqual([]);
  });
});
