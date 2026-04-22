import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TrendFilterDrawer } from '../trend-filter-drawer.component';

type TrendFilterDrawerHarness = {
  readonly cancel: { subscribe(listener: () => void): { unsubscribe(): void } };
  readonly reset: { subscribe(listener: () => void): { unsubscribe(): void } };
  readonly apply: { subscribe(listener: () => void): { unsubscribe(): void } };
  readonly onVisibleChange: (visible: boolean) => void;
  readonly onReset: () => void;
  readonly onApply: () => void;
};

describe('TrendFilterDrawer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrendFilterDrawer],
    }).overrideComponent(TrendFilterDrawer, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): TrendFilterDrawerHarness {
    const fixture = TestBed.createComponent(TrendFilterDrawer);
    fixture.componentRef.setInput('title', 'Trend Filters');
    fixture.detectChanges();

    return fixture.componentInstance as unknown as TrendFilterDrawerHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should emit cancel when the drawer closes without an apply action', () => {
    const component = createComponent();
    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    component.onVisibleChange(false);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should suppress the next cancel emission after apply and then restore normal close handling', () => {
    const component = createComponent();
    const cancelSpy = vi.fn();
    const applySpy = vi.fn();
    component.cancel.subscribe(cancelSpy);
    component.apply.subscribe(applySpy);

    component.onApply();
    component.onVisibleChange(false);
    component.onVisibleChange(false);

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit reset when requested', () => {
    const component = createComponent();
    const resetSpy = vi.fn();
    component.reset.subscribe(resetSpy);

    component.onReset();

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});
