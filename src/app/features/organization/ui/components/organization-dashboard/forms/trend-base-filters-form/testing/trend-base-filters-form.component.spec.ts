import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TrendBaseFiltersForm } from '../trend-base-filters-form.component';

type TrendBaseFiltersFormHarness = {
  readonly form: {
    readonly disabled: boolean;
    readonly controls: {
      readonly dateRange: {
        readonly value: Date[] | null;
        setValue(value: Date[] | null): void;
      };
      readonly compareEnabled: {
        readonly value: boolean;
        setValue(value: boolean): void;
      };
    };
  };
  readonly dateRangeChange: {
    subscribe(listener: (value: Date[] | null) => void): { unsubscribe(): void };
  };
  readonly compareEnabledChange: {
    subscribe(listener: (value: boolean) => void): { unsubscribe(): void };
  };
};

describe('TrendBaseFiltersForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrendBaseFiltersForm],
    }).overrideComponent(TrendBaseFiltersForm, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(options?: {
    readonly dateRange?: Date[] | null;
    readonly compareEnabled?: boolean;
    readonly loading?: boolean;
  }): TrendBaseFiltersFormHarness {
    const fixture = TestBed.createComponent(TrendBaseFiltersForm);
    fixture.componentRef.setInput('dateRangeId', 'dashboard-date-range');
    fixture.componentRef.setInput(
      'dateRange',
      options?.dateRange ?? [new Date('2026-01-01'), new Date('2026-01-08')],
    );
    fixture.componentRef.setInput('compareEnabled', options?.compareEnabled ?? true);
    fixture.componentRef.setInput('loading', options?.loading ?? false);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as TrendBaseFiltersFormHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should synchronize the form controls from the input signals', () => {
    const dateRange = [new Date('2026-02-01'), new Date('2026-02-05')];
    const component = createComponent({ dateRange, compareEnabled: false });

    expect(component.form.controls.dateRange.value).toEqual(dateRange);
    expect(component.form.controls.compareEnabled.value).toBe(false);
  });

  it('should emit date range and compare changes when the form is updated', () => {
    const component = createComponent();
    const nextDateRange = [new Date('2026-03-01'), new Date('2026-03-07')];
    const dateRangeSpy = vi.fn();
    const compareEnabledSpy = vi.fn();
    component.dateRangeChange.subscribe(dateRangeSpy);
    component.compareEnabledChange.subscribe(compareEnabledSpy);

    component.form.controls.dateRange.setValue(nextDateRange);
    component.form.controls.compareEnabled.setValue(false);

    expect(dateRangeSpy).toHaveBeenCalledWith(nextDateRange);
    expect(compareEnabledSpy).toHaveBeenCalledWith(false);
  });

  it('should disable and re-enable the form from the loading input', () => {
    const fixture = TestBed.createComponent(TrendBaseFiltersForm);
    const component = fixture.componentInstance as unknown as TrendBaseFiltersFormHarness;
    fixture.componentRef.setInput('dateRangeId', 'dashboard-date-range');
    fixture.componentRef.setInput('dateRange', [new Date('2026-01-01'), new Date('2026-01-08')]);
    fixture.componentRef.setInput('compareEnabled', true);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(component.form.disabled).toBe(true);

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(component.form.disabled).toBe(false);
  });
});
