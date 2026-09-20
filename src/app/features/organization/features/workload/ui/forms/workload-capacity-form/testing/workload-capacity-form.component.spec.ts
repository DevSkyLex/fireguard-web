import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import { HlmDatePicker } from '@shared/ui/date-picker';
import { WorkloadCapacityForm } from '../workload-capacity-form.component';
describe('WorkloadCapacityForm', () => {
  let fixture: ComponentFixture<WorkloadCapacityForm>;
  const input = async (id: string, value: string): Promise<void> => {
    const field = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#' + id);
    if (!field) throw new Error(`Missing field ${id}`);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideInteractionCapabilities()] });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    fixture = TestBed.createComponent(WorkloadCapacityForm);
    fixture.componentRef.setInput('initialDate', '2026-09-16');
    await fixture.whenStable();
  });
  afterEach(() => vi.unstubAllGlobals());
  it('starts without assumed hours and refuses a blank weekly pattern', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
          'input[id$="-hours"]',
        ),
      ).every((field) => field.value === ''),
    ).toBe(true);
  });
  it('does not mark an untouched form dirty when its fields first render', async () => {
    const fresh = TestBed.createComponent(WorkloadCapacityForm);
    const changed = vi.fn();
    fresh.componentInstance.dirtyChanged.subscribe(changed);
    await fresh.whenStable();
    expect(changed).toHaveBeenLastCalledWith(false);
  });
  it('permits changing scope again after every input has been cleared', async () => {
    const changed = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(changed);
    await input('capacity-day-0-hours', '7');
    expect(changed).toHaveBeenLastCalledWith(true);
    await input('capacity-day-0-hours', '');
    expect(changed).toHaveBeenLastCalledWith(false);
  });
  it('emits a complete explicit ISO week, including zero days', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    await Promise.all(
      Array.from({ length: 7 }, (_, index) =>
        input('capacity-day-' + index + '-hours', index < 5 ? '7' : '0'),
      ),
    );
    await input('capacity-day-0-minutes', '30');
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      effectiveOn: '2026-09-16',
      minutes: [450, 420, 420, 420, 420, 0, 0],
    });
  });
  it('rejects fractional minutes and retains input after a pending write', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    await Promise.all(
      Array.from({ length: 7 }, (_, index) => input('capacity-day-' + index + '-hours', '0')),
    );
    await input('capacity-day-0-minutes', '4.5');
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    await input('capacity-day-0-minutes', '30');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        '#capacity-day-0-minutes',
      )?.value,
    ).toBe('30');
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      effectiveOn: '2026-09-16',
      minutes: [30, 0, 0, 0, 0, 0, 0],
    });
  });
  it('records a zero-capacity absence and rejects reversed periods', async () => {
    fixture.componentRef.setInput('mode', 'exception');
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.exceptionSubmitted.subscribe(submitted);
    await input('capacity-starts-on', '2026-09-18');
    await input('capacity-ends-on', '2026-09-16');
    await input('capacity-available-hours', '0');
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    await input('capacity-ends-on', '2026-09-20');
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      startsOn: '2026-09-18',
      endsOn: '2026-09-20',
      minutes: 0,
    });
  });

  it('prefills configured hours, minutes and today without marking the form dirty', async () => {
    const changed = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(changed);
    fixture.componentRef.setInput('initialWeek', [450, 420, 420, 420, 420, 0, 0]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#capacity-effective-on')?.textContent).toContain('Sep 16, 2026');
    expect(root.querySelector<HTMLInputElement>('#capacity-day-0-hours')?.value).toBe('7');
    expect(root.querySelector<HTMLInputElement>('#capacity-day-0-minutes')?.value).toBe('30');
    expect(root.querySelector('[data-testid="workload-capacity-total"]')?.textContent?.trim()).toBe(
      '35 h 30 min',
    );
    expect(root.querySelectorAll('hlm-field-error')).toHaveLength(0);
    expect(changed).toHaveBeenLastCalledWith(false);
  });

  it('keeps unknown capacity distinct from a configured zero and shows errors only after interaction', async () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('hlm-field-error')).toHaveLength(0);
    expect(root.querySelector('[data-testid="workload-capacity-total"]')?.textContent?.trim()).toBe(
      '—',
    );
    await submit();
    expect(root.querySelectorAll('hlm-field-error')).toHaveLength(7);
    expect(document.activeElement?.id).toBe('capacity-day-0-hours');
    fixture.componentRef.setInput('initialWeek', [0, 0, 0, 0, 0, 0, 0]);
    await fixture.whenStable();
    expect(root.querySelectorAll('hlm-field-error')).toHaveLength(0);
    expect(root.querySelector('[data-testid="workload-capacity-total"]')?.textContent?.trim()).toBe(
      '0 min',
    );
  });

  it.each([
    ['25', '0'],
    ['24', '1'],
    ['7', '60'],
    ['-1', '0'],
    ['7.5', '0'],
    ['7', '-1'],
  ])(
    'rejects invalid duration %s h %s min with one error below the day',
    async (hours, minutes) => {
      fixture.componentRef.setInput('initialWeek', [0, 0, 0, 0, 0, 0, 0]);
      await fixture.whenStable();
      const submitted = vi.fn();
      fixture.componentInstance.weekSubmitted.subscribe(submitted);
      await input('capacity-day-0-hours', hours);
      await input('capacity-day-0-minutes', minutes);
      await submit();
      expect(submitted).not.toHaveBeenCalled();
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('hlm-field-error'),
      ).toHaveLength(1);
    },
  );

  it('uses organization display order but keeps ISO order in the submitted payload', async () => {
    fixture.componentRef.setInput('firstDayOfWeek', 'sunday');
    fixture.componentRef.setInput('initialWeek', [60, 120, 180, 240, 300, 360, 1440]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[id$="-hours"]')?.id).toBe(
      'capacity-day-6-hours',
    );
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      effectiveOn: '2026-09-16',
      minutes: [60, 120, 180, 240, 300, 360, 1440],
    });
  });

  it('converts partial-day availability without reducing it to a full absence', async () => {
    fixture.componentRef.setInput('mode', 'exception');
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.exceptionSubmitted.subscribe(submitted);
    await input('capacity-available-hours', '3');
    await input('capacity-available-minutes', '30');
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      startsOn: '2026-09-16',
      endsOn: '2026-09-16',
      minutes: 210,
    });
  });

  it('repeats an explicit duration while preserving zero-capacity days', async () => {
    fixture.componentRef.setInput('initialWeek', [450, 240, 420, 420, 420, 0, 0]);
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Repeat Monday'))
      ?.click();
    await fixture.whenStable();
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      effectiveOn: '2026-09-16',
      minutes: [450, 450, 450, 450, 450, 0, 0],
    });
  });

  it('repeats into unknown days only after a working day is explicitly supplied', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const repeat = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('repeat it'),
    );
    expect(repeat?.disabled).toBe(true);
    await input('capacity-day-1-hours', '3');
    await input('capacity-day-1-minutes', '30');
    await input('capacity-day-6-hours', '0');
    repeat?.click();
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      effectiveOn: '2026-09-16',
      minutes: [210, 210, 210, 210, 210, 210, 0],
    });
  });

  it('restores prefilled values and untouched validation after a confirmed reset', async () => {
    fixture.componentRef.setInput('initialWeek', [420, 420, 420, 420, 420, 0, 0]);
    await fixture.whenStable();
    const changed = vi.fn();
    fixture.componentInstance.dirtyChanged.subscribe(changed);
    await input('capacity-day-0-minutes', '80');
    await submit();
    fixture.componentInstance.resetDraft();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLInputElement>('#capacity-day-0-minutes')?.value).toBe('0');
    expect(root.querySelectorAll('hlm-field-error')).toHaveLength(0);
    expect(changed).toHaveBeenLastCalledWith(false);
  });

  it('records full absence only after the explicit shortcut is used', async () => {
    fixture.componentRef.setInput('mode', 'exception');
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        '#capacity-available-hours',
      )?.value,
    ).toBe('');
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Full absence'))
      ?.click();
    await fixture.whenStable();
    const submitted = vi.fn();
    fixture.componentInstance.exceptionSubmitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledWith({
      startsOn: '2026-09-16',
      endsOn: '2026-09-16',
      minutes: 0,
    });
  });

  it('keeps picker dates local and restores the initial date after reset', async () => {
    fixture.componentRef.setInput('initialWeek', [420, 420, 420, 420, 420, 0, 0]);
    await fixture.whenStable();
    const picker = fixture.debugElement.query(By.directive(HlmDatePicker))
      .componentInstance as HlmDatePicker<Date>;
    const submitted = vi.fn();
    fixture.componentInstance.weekSubmitted.subscribe(submitted);
    picker.updateDate(new Date(2026, 9, 25));
    await fixture.whenStable();
    await submit();
    expect(submitted).toHaveBeenLastCalledWith({
      effectiveOn: '2026-10-25',
      minutes: [420, 420, 420, 420, 420, 0, 0],
    });
    fixture.componentInstance.resetDraft();
    await fixture.whenStable();
    expect(picker.value()).toEqual(new Date(2026, 8, 16));
    picker.updateDate(null);
    await fixture.whenStable();
    await submit();
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('hlm-field-error')?.textContent,
    ).toContain('Choose a date.');
  });

  it('disables the date picker during a pending write', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    const picker = fixture.debugElement.query(By.directive(HlmDatePicker))
      .componentInstance as HlmDatePicker<Date>;
    expect(picker.disabledState()).toBe(true);
    picker.updateDate(new Date(2026, 9, 25));
    expect(picker.value()).toEqual(new Date(2026, 8, 16));
  });

  it('places the day error next to its label while preserving both controls descriptions', async () => {
    fixture.componentRef.setInput('initialWeek', [420, 420, 420, 420, 420, 0, 0]);
    await fixture.whenStable();
    await input('capacity-day-0-hours', '25');
    await submit();
    const root = fixture.nativeElement as HTMLElement;
    const error = root.querySelector('#capacity-day-0-error');
    expect(error?.previousElementSibling?.id).toBe('capacity-day-0-label');
    expect(root.querySelector('#capacity-day-0-hours')?.getAttribute('aria-describedby')).toContain(
      'capacity-day-0-error',
    );
    expect(
      root.querySelector('#capacity-day-0-minutes')?.getAttribute('aria-describedby'),
    ).toContain('capacity-day-0-error');
  });
});
