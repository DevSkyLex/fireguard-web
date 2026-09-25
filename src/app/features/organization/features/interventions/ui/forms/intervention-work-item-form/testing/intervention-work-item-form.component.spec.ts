import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { HlmDateRangePicker } from '@shared/ui/date-picker';
import { InterventionWorkItemForm } from '../intervention-work-item-form.component';
import type { InterventionWorkItemFormValues } from '../models';

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('InterventionWorkItemForm', () => {
  let fixture: ComponentFixture<InterventionWorkItemForm>;
  let submissions: InterventionWorkItemFormValues[];
  let cancellations: void[];
  const mobile = signal(false);

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-work-item-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-work-item-cancel"]') as HTMLButtonElement;
  const picker = (): HlmDateRangePicker<Date> =>
    fixture.debugElement.query(By.directive(HlmDateRangePicker))
      .componentInstance as HlmDateRangePicker<Date>;
  const fill = async (id: string, value: string): Promise<void> => {
    const input = root().querySelector<HTMLInputElement>(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: {
            regionalFormatting: signal({
              ...DEFAULT_REGIONAL_FORMAT_SETTINGS,
              timezone: 'Europe/Paris',
            }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(InterventionWorkItemForm);
    await fixture.whenStable();

    submissions = [];
    cancellations = [];
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
    fixture.componentInstance.cancelled.subscribe(() => cancellations.push(undefined));
  });

  it('should emit the drafted item on a valid submit, with the optional fields trimmed', async () => {
    await submit();

    expect(submissions).toEqual([
      {
        action: 'inventory',
        target: '',
        assignee: '',
        estimatedMinutes: '',
        workStartsOn: '',
        workEndsOn: '',
      },
    ]);
  });

  it('should not submit while the creation request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should not submit once the prepared scope may no longer grow', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should let the planner back out without a payload', () => {
    cancelButton().click();

    expect(cancellations).toHaveLength(1);
    expect(submissions).toEqual([]);
  });

  it('should surface what the API said about a rejected creation', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'action', message: 'This action is not recognized.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-work-item-error"]')?.textContent,
    ).toContain('This action is not recognized.');
  });

  it('should fall back to a readable message when the API said nothing showable', async () => {
    fixture.componentRef.setInput('serverError', new Error('boom'));
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-work-item-error"]')?.textContent,
    ).toContain('The work item could not be created.');
  });

  it('should announce nothing before a failure', () => {
    expect(root().querySelector('[data-testid="intervention-work-item-error"]')).toBeNull();
  });

  it('should list the cancel button before the submit button in the action row', () => {
    const footer = root().querySelector('hlm-sheet-footer') as HTMLElement;
    const buttons = Array.from(footer.querySelectorAll('button'));

    expect(buttons[0]).toBe(cancelButton());
    expect(buttons[1]).toBe(submitButton());
  });

  it('should swap the submit label to the pending wording while creating', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(root().textContent).toContain('Adding…');
  });

  it('should mark the action label required with an aria-hidden asterisk', () => {
    const label = root().querySelector(
      'label[for="intervention-work-item-action"]',
    ) as HTMLLabelElement;
    const asterisk = label.querySelector('span[aria-hidden="true"]');

    expect(asterisk?.textContent).toContain('*');
  });

  it('should use compact spacing between the work item fields', () => {
    expect(root().querySelector('hlm-field-group')?.classList).toContain('gap-4');
  });

  it.each([
    ['2', '30', '150'],
    ['', '45', '45'],
    ['4', '', '240'],
    ['0', '', '0'],
    ['', '0', '0'],
    ['32', '15', '1935'],
  ])('should convert %s hours and %s minutes to %s minutes', async (hours, minutes, expected) => {
    await fill('work-item-estimate-hours', hours);
    await fill('work-item-estimate-minutes', minutes);
    await submit();
    expect(submissions[0].estimatedMinutes).toBe(expected);
  });

  it.each([
    ['work-item-estimate-hours', '-1'],
    ['work-item-estimate-hours', '1.5'],
    ['work-item-estimate-hours', '2e2'],
    ['work-item-estimate-hours', '999999999999999999'],
    ['work-item-estimate-minutes', '60'],
    ['work-item-estimate-minutes', '-5'],
    ['work-item-estimate-minutes', '5.5'],
  ])('should reject invalid duration %s = %s near its field', async (id, value) => {
    await fill(id, value);
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector('hlm-field-error')?.textContent).toContain('Enter');
  });

  it('should return to an unknown estimate when both parts are cleared', async () => {
    await fill('work-item-estimate-hours', '2');
    await fill('work-item-estimate-hours', '');
    await submit();
    expect(submissions[0].estimatedMinutes).toBe('');
  });

  it('should preserve duration and dates after a server rejection', async () => {
    await fill('work-item-estimate-hours', '2');
    await fill('work-item-estimate-minutes', '30');
    picker().updateDate([new Date(2026, 8, 14), new Date(2026, 8, 18)]);
    await fixture.whenStable();
    await submit();
    fixture.componentRef.setInput('serverError', new Error('Rejected'));
    await fixture.whenStable();
    await submit();
    expect(submissions).toHaveLength(2);
    expect(submissions[1]).toEqual(submissions[0]);
    expect(submissions[1]).toMatchObject({
      estimatedMinutes: '150',
      workStartsOn: '2026-09-14',
      workEndsOn: '2026-09-18',
    });
  });

  it('should keep the inherited period implicit until a range is chosen', async () => {
    fixture.componentRef.setInput('workloadStartsOn', '2026-09-14');
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-20');
    await fixture.whenStable();
    expect(root().textContent).toContain('Sep 14, 2026 – Sep 20, 2026');
    expect(picker().minDate()).toEqual(new Date(2026, 8, 14));
    expect(picker().maxDate()).toEqual(new Date(2026, 8, 20));
    await submit();
    expect(submissions[0]).toMatchObject({ workStartsOn: '', workEndsOn: '' });
  });

  it('should accept a same-day range and serialize calendar days without a UTC shift', async () => {
    fixture.componentRef.setInput('workloadStartsOn', '2026-03-29');
    fixture.componentRef.setInput('workloadEndsOn', '2026-03-29');
    await fixture.whenStable();
    picker().updateDate([new Date(2026, 2, 29), new Date(2026, 2, 29)]);
    await fixture.whenStable();
    await submit();
    expect(submissions[0]).toMatchObject({ workStartsOn: '2026-03-29', workEndsOn: '2026-03-29' });
  });

  it.each([
    [13, 16],
    [16, 21],
    [18, 16],
  ])('should reject an incompatible range from %s to %s', async (start, end) => {
    fixture.componentRef.setInput('workloadStartsOn', '2026-09-14');
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-20');
    await fixture.whenStable();
    picker().updateDate([new Date(2026, 8, start), new Date(2026, 8, end)]);
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
    expect(root().querySelector('#work-item-period-error')?.textContent).toContain(
      'within the intervention period',
    );
  });

  it('should revalidate a selected period when intervention bounds change', async () => {
    picker().updateDate([new Date(2026, 8, 14), new Date(2026, 8, 20)]);
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-18');
    await fixture.whenStable();
    await submit();
    expect(submissions).toEqual([]);
  });

  it('should interpret timestamp bounds in the organization timezone, including the next local day', async () => {
    fixture.componentRef.setInput('workloadStartsOn', '2026-09-13T23:00:00Z');
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-19T23:00:00Z');
    await fixture.whenStable();
    expect(picker().minDate()).toEqual(new Date(2026, 8, 14));
    expect(picker().maxDate()).toEqual(new Date(2026, 8, 20));
    expect(root().textContent).toContain('Sep 14, 2026 – Sep 20, 2026');
  });

  it('should remove the override and mark the form dirty through the reset action', async () => {
    const dirty: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((value) => dirty.push(value));
    picker().updateDate([new Date(2026, 8, 14), new Date(2026, 8, 20)]);
    await fixture.whenStable();
    const reset = Array.from(root().querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Use intervention dates'),
    );
    reset?.click();
    await fixture.whenStable();
    await submit();
    expect(picker().value()).toBeNull();
    expect(submissions[0]).toMatchObject({ workStartsOn: '', workEndsOn: '' });
    expect(dirty).toContain(true);
  });

  it('should disable effort and date controls while saving', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(root().querySelector<HTMLInputElement>('#work-item-estimate-hours')?.disabled).toBe(
      true,
    );
    expect(root().querySelector<HTMLInputElement>('#work-item-estimate-minutes')?.disabled).toBe(
      true,
    );
    expect(root().querySelector<HTMLButtonElement>('#work-item-period')?.disabled).toBe(true);
  });

  it('stages mobile dates until Apply and restores the committed range after cancelling a new pick', async () => {
    mobile.set(true);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const start = new Date(2026, 8, 14);
    const end = new Date(2026, 8, 18);

    component['changeCalendarState']('open');
    component['calendarStart'].set(start);
    component['calendarEnd'].set(end);
    expect(component['calendarRangeComplete']()).toBe(true);
    expect(component['workStartsOn']()).toBe('');

    component['applyCalendarRange']();
    await fixture.whenStable();
    expect(component['calendarState']()).toBe('closed');
    expect(component['workStartsOn']()).toBe('2026-09-14');
    expect(component['workEndsOn']()).toBe('2026-09-18');

    component['changeCalendarState']('open');
    expect(component['calendarStart']()).toEqual(start);
    expect(component['calendarEnd']()).toEqual(end);
    component['calendarStart'].set(new Date(2026, 8, 20));
    component['calendarEnd'].set(new Date(2026, 8, 21));
    component['changeCalendarState']('closed');
    component['changeCalendarState']('open');
    expect(component['calendarStart']()).toEqual(start);
    expect(component['calendarEnd']()).toEqual(end);

    await submit();
    expect(submissions[0]).toMatchObject({
      workStartsOn: '2026-09-14',
      workEndsOn: '2026-09-18',
    });
  });

  it('rejects incomplete, reversed and out-of-bounds mobile periods before committing', async () => {
    mobile.set(true);
    fixture.componentRef.setInput('workloadStartsOn', '2026-09-14');
    fixture.componentRef.setInput('workloadEndsOn', '2026-09-20');
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['changeCalendarState']('open');

    component['calendarStart'].set(new Date(2026, 8, 14));
    expect(component['calendarRangeComplete']()).toBe(false);
    component['applyCalendarRange']();
    expect(component['workStartsOn']()).toBe('');

    component['calendarEnd'].set(new Date(2026, 8, 13));
    expect(component['calendarRangeComplete']()).toBe(false);
    component['calendarEnd'].set(new Date(2026, 8, 21));
    expect(component['calendarRangeComplete']()).toBe(false);
    component['calendarStart'].set(new Date(2026, 8, 13));
    component['calendarEnd'].set(new Date(2026, 8, 18));
    expect(component['calendarRangeComplete']()).toBe(false);
    component['applyCalendarRange']();
    expect(component['calendarState']()).toBe('open');
    expect(component['workStartsOn']()).toBe('');
  });

  it('cannot apply a staged mobile range while the form is pending or disabled', async () => {
    mobile.set(true);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['changeCalendarState']('open');
    component['calendarStart'].set(new Date(2026, 8, 14));
    component['calendarEnd'].set(new Date(2026, 8, 18));
    expect(component['calendarRangeComplete']()).toBe(true);

    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    component['applyCalendarRange']();
    expect(component['workStartsOn']()).toBe('');

    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    component['applyCalendarRange']();
    expect(component['workStartsOn']()).toBe('');

    fixture.componentRef.setInput('disabled', false);
    await fixture.whenStable();
    component['changeCalendarState']('open');
    component['calendarStart'].set(new Date(2026, 8, 14));
    component['calendarEnd'].set(new Date(2026, 8, 18));
    expect(component['calendarRangeComplete']()).toBe(true);
    component['applyCalendarRange']();
    expect(component['workStartsOn']()).toBe('2026-09-14');
  });

  it('keeps unresolved option labels explicit while still naming known targets and members', async () => {
    fixture.componentRef.setInput('targetOptions', [
      { value: '/api/equipment/equipment-1', label: 'Extinguisher A-12' },
    ]);
    fixture.componentRef.setInput('memberOptions', [
      { value: '/api/organization-members/member-1', displayName: 'Alex Martin' },
    ]);
    await fixture.whenStable();

    expect(fixture.componentInstance['targetLabelOf']('/api/equipment/equipment-1')).toBe(
      'Extinguisher A-12',
    );
    expect(fixture.componentInstance['targetLabelOf']('/api/equipment/missing')).toBe(
      'Unknown target',
    );
    expect(fixture.componentInstance['memberLabelOf']('/api/organization-members/member-1')).toBe(
      'Alex Martin',
    );
    expect(fixture.componentInstance['memberLabelOf']('/api/organization-members/missing')).toBe(
      'Unknown member',
    );
  });
});
