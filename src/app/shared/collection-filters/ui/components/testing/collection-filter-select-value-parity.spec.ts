import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CollectionFilterOption } from '../../../models';
import { CollectionFilterDate } from '../collection-filter-date';
import { CollectionFilterDateRange } from '../collection-filter-date-range';
import { CollectionFilterMultiSelect } from '../collection-filter-multi-select';
import { CollectionFilterSelect } from '../collection-filter-select';

const OPTIONS: readonly CollectionFilterOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
];

const RANGE_START: Date = new Date(2024, 0, 10);
const RANGE_END: Date = new Date(2024, 0, 15);

/**
 * Mounts all four value controls — `CollectionFilterSelect`,
 * `CollectionFilterMultiSelect`, `CollectionFilterDate` and
 * `CollectionFilterDateRange` — side by side under an identical field, so the
 * parity spec below can assert their rendered markup rather than trust that
 * four hand-maintained templates stay in lockstep.
 */
@Component({
  selector: 'app-collection-filter-value-parity-host',
  imports: [
    CollectionFilterSelect,
    CollectionFilterMultiSelect,
    CollectionFilterDate,
    CollectionFilterDateRange,
  ],
  template: `
    <app-collection-filter-select
      [options]="options"
      [value]="singleValue()"
      placeholder="Status"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="parity-select"
      testId="parity-select"
      [disabled]="disabled()"
    />
    <app-collection-filter-multi-select
      [options]="options"
      [values]="multiValues()"
      placeholder="Status"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="parity-multi-select"
      testId="parity-multi-select"
      [disabled]="disabled()"
    />
    <app-collection-filter-date
      [value]="dateValue()"
      placeholder="Due date"
      accessibleName="Change filter: Due date"
      triggerId="parity-date"
      testId="parity-date"
      [disabled]="disabled()"
    />
    <app-collection-filter-date-range
      [value]="dateRangeValue()"
      placeholder="Due range"
      accessibleName="Change filter: Due range"
      triggerId="parity-date-range"
      testId="parity-date-range"
      [disabled]="disabled()"
    />
  `,
})
class CollectionFilterValueParityHost {
  public readonly options: readonly CollectionFilterOption[] = OPTIONS;
  public readonly singleValue: WritableSignal<string | null> = signal<string | null>('planned');
  public readonly multiValues: WritableSignal<readonly string[]> = signal<readonly string[]>([
    'planned',
  ]);
  public readonly dateValue: WritableSignal<Date | null> = signal<Date | null>(RANGE_START);
  public readonly dateRangeValue: WritableSignal<readonly [Date, Date] | null> = signal<
    readonly [Date, Date] | null
  >([RANGE_START, RANGE_END]);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
}

/** Minimal ResizeObserver stand-in: `hlm-date-picker`/`hlm-date-range-picker` observe their anchor on init, and the test environment provides no implementation. */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

/** Class tokens of an element, order-independent — the parity contract is the set of utilities applied, not their declaration order. */
function classTokens(element: Element | null): readonly string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((token: string): boolean => token.length > 0)
    .toSorted();
}

beforeAll(() => {
  globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= (): void => {};
});

/**
 * `CollectionFilterSelect` / `CollectionFilterMultiSelect` value parity
 *
 * @description
 * `CollectionFilterSelect` and `CollectionFilterMultiSelect` are deliberately
 * two components, not one with a `multiple` flag — spartan binds each to a
 * distinct brain directive (`ARCHITECTURE.md` §10.3's own class docs explain
 * why: a single-choice list announced as multi-selectable is an accessibility
 * defect, not a styling detail). That split means nothing enforces that their
 * two hand-maintained templates keep rendering the same trigger and the same
 * value pastille — this spec is that enforcement, standing in for the shared
 * artefact an extraction would otherwise provide. If it becomes painful to
 * keep green as the two templates evolve, that pain is the signal the
 * extraction is due — not a reason to loosen this spec.
 */
describe('CollectionFilterSelect / CollectionFilterMultiSelect value parity', () => {
  let fixture: ComponentFixture<CollectionFilterValueParityHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterValueParityHost);
    await fixture.whenStable();
  });

  function trigger(testId: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  }

  it('should render the trigger with the identical class string on both twins', () => {
    const selectTokens: readonly string[] = classTokens(trigger('parity-select'));
    const multiSelectTokens: readonly string[] = classTokens(trigger('parity-multi-select'));

    expect(selectTokens.length).toBeGreaterThan(0);
    expect(selectTokens).toEqual(multiSelectTokens);
  });

  it('should render the selected value as the identical filled pastille on both twins', () => {
    const selectChip: Element | null | undefined = trigger('parity-select')?.querySelector(
      '[data-testid="collection-filter-value"]',
    );
    const multiSelectChip: Element | null | undefined = trigger(
      'parity-multi-select',
    )?.querySelector('[data-testid="collection-filter-value"]');

    expect(selectChip).not.toBeNull();
    expect(selectChip?.textContent?.trim()).toBe(multiSelectChip?.textContent?.trim());
    expect(classTokens(selectChip ?? null)).toEqual(classTokens(multiSelectChip ?? null));
  });

  it('should apply the same disabled treatment to both twins', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(trigger('parity-select')?.getAttribute('aria-disabled')).toBe('true');
    expect(trigger('parity-multi-select')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('should reach the actual focusable button, not just the wrapper, with the same aria-disabled on both twins', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const selectButton: HTMLButtonElement | null | undefined =
      trigger('parity-select')?.querySelector('button');
    const multiSelectButton: HTMLButtonElement | null | undefined =
      trigger('parity-multi-select')?.querySelector('button');

    expect(selectButton?.getAttribute('aria-disabled')).toBe('true');
    expect(multiSelectButton?.getAttribute('aria-disabled')).toBe('true');
  });
});

/**
 * Value pastille parity across all four value controls
 *
 * @description
 * `COLLECTION_FILTER_VALUE_CLASS` (`constants/collection-filter-control.constants.ts`)
 * is the one string genuinely identical, mot pour mot, across
 * `CollectionFilterSelect`, `CollectionFilterMultiSelect`, `CollectionFilterDate`
 * and `CollectionFilterDateRange` — unlike their *trigger* chrome, which turned
 * out to be two distinct strings (see each component's own class doc). This
 * spec is the shared artefact that constant extraction already provides for
 * the pastille; it stands in for nothing.
 */
describe('CollectionFilterSelect / CollectionFilterMultiSelect / CollectionFilterDate / CollectionFilterDateRange value pastille parity', () => {
  let fixture: ComponentFixture<CollectionFilterValueParityHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterValueParityHost);
    await fixture.whenStable();
  });

  function pastille(testId: string): Element | null {
    return (
      (fixture.nativeElement as HTMLElement)
        .querySelector(`[data-testid="${testId}"]`)
        ?.querySelector('[data-testid="collection-filter-value"]') ?? null
    );
  }

  it('should render the identical filled pastille class on all four value controls', () => {
    const referenceTokens: readonly string[] = classTokens(pastille('parity-select'));
    const testIds: readonly string[] = [
      'parity-select',
      'parity-multi-select',
      'parity-date',
      'parity-date-range',
    ];

    expect(referenceTokens.length).toBeGreaterThan(0);
    for (const testId of testIds) {
      expect(classTokens(pastille(testId))).toEqual(referenceTokens);
    }
  });
});
