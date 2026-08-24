import {
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  CollectionFilterField,
  CollectionFilterOperator,
  CollectionFilterOperatorChangedEvent,
} from '../../../../models';
import { CollectionFilterBar } from '../collection-filter-bar.component';

const FIELDS: readonly CollectionFilterField[] = [
  { key: 'status', fieldLabel: 'Status', icon: 'lucideCircleDot', operators: ['equals'] },
  { key: 'type', fieldLabel: 'Type', icon: 'lucideWrench', operators: ['equals', 'notEquals'] },
  { key: 'priority', fieldLabel: 'Priority', icon: 'lucideFlag', operators: ['equals'] },
];

/** Reads which chip a `[data-testid$="-value"]` marker belongs to, in current DOM order. */
function renderedChipMarkers(): readonly string[] {
  return Array.from(document.querySelectorAll('[data-testid="widgets-filter-chip"]')).map(
    (chip) => chip.querySelector('[data-testid$="-value"]')?.getAttribute('data-testid') ?? '',
  );
}

/** Every operator select trigger's own `id` rendered under a fixture's root, in DOM order. */
function operatorTriggerIds(root: HTMLElement): readonly string[] {
  return Array.from(root.querySelectorAll('label.sr-only')).map(
    (label: Element): string => label.getAttribute('for') ?? '',
  );
}

@Component({
  selector: 'app-collection-filter-bar-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="activeKeys()"
      [pendingKey]="pendingKey()"
      [templates]="templates()"
      [activeOperators]="activeOperators()"
      testIdPrefix="widgets"
      (fieldPicked)="onFieldPicked($event)"
      (fieldRemoved)="onFieldRemoved($event)"
      (filtersCleared)="cleared = cleared + 1"
      (operatorChanged)="operatorChanges.push($event)"
    />

    <ng-template #statusValue><span data-testid="status-value">Planned</span></ng-template>
    <ng-template #typeValue><span data-testid="type-value">Inspection</span></ng-template>
  `,
})
class CollectionFilterBarHost {
  public readonly fields: readonly CollectionFilterField[] = FIELDS;
  public readonly activeKeys: WritableSignal<readonly string[]> = signal<readonly string[]>([
    'status',
  ]);
  public readonly pendingKey: WritableSignal<string | null> = signal<string | null>(null);
  public readonly activeOperators: WritableSignal<
    Readonly<Record<string, CollectionFilterOperator>>
  > = signal<Readonly<Record<string, CollectionFilterOperator>>>({});
  public readonly picked: string[] = [];
  public readonly removed: string[] = [];
  public readonly operatorChanges: CollectionFilterOperatorChangedEvent[] = [];
  public cleared: number = 0;

  /** Mirrors a real page's `fieldPicked` handler: opens the picked field's own selector. */
  public onFieldPicked(key: string): void {
    this.picked.push(key);
    this.pendingKey.set(key);
  }

  /** Mirrors a real page's `fieldRemoved` handler: drops the key from the active narrowing, so the chip actually leaves the row. */
  public onFieldRemoved(key: string): void {
    this.removed.push(key);
    this.activeKeys.update((current: readonly string[]): readonly string[] =>
      current.filter((entry: string): boolean => entry !== key),
    );
  }

  private readonly statusValue = viewChild<TemplateRef<unknown>>('statusValue');
  private readonly typeValue = viewChild<TemplateRef<unknown>>('typeValue');

  public readonly templates: Signal<Readonly<Record<string, TemplateRef<unknown>>>> = computed(
    () => {
      const record: Record<string, TemplateRef<unknown>> = {};
      const status = this.statusValue();
      const type = this.typeValue();
      if (status) record['status'] = status;
      if (type) record['type'] = type;
      return record;
    },
  );
}

/** A single-field catalog, wholly covered by its one active chip — no sibling chip and no "+ Filter" trigger can ever exist alongside it. */
@Component({
  selector: 'app-collection-filter-bar-single-field-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="activeKeys"
      [templates]="{}"
      testIdPrefix="widgets"
    />
  `,
})
class CollectionFilterBarSingleFieldHost {
  public readonly fields: readonly CollectionFilterField[] = [
    { key: 'status', fieldLabel: 'Status', icon: 'lucideCircleDot', operators: ['equals'] },
  ];
  public readonly activeKeys: readonly string[] = ['status'];
}

const MULTI_OPERATOR_FIELDS: readonly CollectionFilterField[] = [
  {
    key: 'status',
    fieldLabel: 'Status',
    icon: 'lucideCircleDot',
    operators: ['equals', 'notEquals'],
  },
  { key: 'type', fieldLabel: 'Type', icon: 'lucideWrench', operators: ['equals', 'notEquals'] },
];

/** Two fields both declaring more than one operator, both active — so both chips render an operator select rather than a fixed label. */
@Component({
  selector: 'app-collection-filter-bar-operator-id-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="activeKeys"
      [templates]="{}"
      testIdPrefix="widgets"
    />
  `,
})
class CollectionFilterBarOperatorIdHost {
  public readonly fields: readonly CollectionFilterField[] = MULTI_OPERATOR_FIELDS;
  public readonly activeKeys: readonly string[] = MULTI_OPERATOR_FIELDS.map(
    (field: CollectionFilterField): string => field.key,
  );
}

const UNAVAILABLE_FIELDS: readonly CollectionFilterField[] = [
  { key: 'status', fieldLabel: 'Status', icon: 'lucideCircleDot', operators: ['equals'] },
  {
    key: 'archived',
    fieldLabel: 'Archived',
    icon: 'lucideArchive',
    operators: ['equals'],
    unavailableReason: 'Not available on this view.',
  },
];

/** A catalog carrying one field whose `unavailableReason` is set, never active — proves `pickField()`'s own guard rather than `FilterChip`'s. */
@Component({
  selector: 'app-collection-filter-bar-unavailable-field-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="[]"
      [templates]="{}"
      testIdPrefix="widgets"
      (fieldPicked)="picked.push($event)"
    />
  `,
})
class CollectionFilterBarUnavailableFieldHost {
  public readonly fields: readonly CollectionFilterField[] = UNAVAILABLE_FIELDS;
  public readonly picked: string[] = [];
}

/**
 * The unavailable field pre-active — the case a page's own URL-backed
 * narrowing already carried before a view switch made the field
 * unavailable. Unlike {@link CollectionFilterBarUnavailableFieldHost}, this
 * one exercises `FilterChip`'s own reason row rather than `pickField`'s
 * guard.
 */
@Component({
  selector: 'app-collection-filter-bar-unavailable-active-field-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="activeKeys"
      [templates]="{}"
      testIdPrefix="widgets"
    />
  `,
})
class CollectionFilterBarUnavailableActiveFieldHost {
  public readonly fields: readonly CollectionFilterField[] = UNAVAILABLE_FIELDS;
  public readonly activeKeys: readonly string[] = ['archived'];
}

/**
 * Minimal ResizeObserver stand-in: the operator select's popover observes
 * its anchor, and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('CollectionFilterBar', () => {
  let fixture: ComponentFixture<CollectionFilterBarHost>;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CollectionFilterBarHost],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(CollectionFilterBarHost);
    await fixture.whenStable();
  });

  function byTestId(testId: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  }

  /** Ensures the "+ Filter" list is open — it may already be, since the bar opens it on arrival when nothing is set. */
  async function openAddList(): Promise<void> {
    if (document.querySelector('[data-testid="widgets-filters-add-option"]') === null) {
      byTestId('widgets-filters-add')?.click();
      await fixture.whenStable();
    }
  }

  it('should render one chip per active key, projecting the matching template', () => {
    expect(byTestId('status-value')).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(1);
  });

  it('should offer only the unset fields in the "+ Filter" list', async () => {
    await openAddList();

    const options = document.querySelectorAll('[data-testid="widgets-filters-add-option"]');
    expect(options.length).toBe(2);
    expect(Array.from(options).map((el) => el.textContent?.trim())).toEqual(['Type', 'Priority']);
  });

  it('should emit fieldPicked and render the pending chip once a field is picked from the menu', async () => {
    fixture.componentInstance.pendingKey.set('priority');
    await fixture.whenStable();

    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(2);
  });

  it('should keep a picked field’s chip once its value control closes with nothing chosen', async () => {
    await openAddList();
    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]')[0]
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.picked).toEqual(['type']);
    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(2);

    fixture.componentInstance.pendingKey.set(null);
    await fixture.whenStable();

    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(2);
  });

  it('should stop offering a picked field in the "+ Filter" list while its chip is on screen', async () => {
    await openAddList();
    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]')[0]
      ?.click();
    await fixture.whenStable();
    fixture.componentInstance.pendingKey.set(null);
    await fixture.whenStable();

    await openAddList();

    expect(
      Array.from(document.querySelectorAll('[data-testid="widgets-filters-add-option"]')).map(
        (el) => el.textContent?.trim(),
      ),
    ).toEqual(['Priority']);
  });

  it('should offer a picked field again once its chip is removed', async () => {
    await openAddList();
    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]')[0]
      ?.click();
    await fixture.whenStable();
    fixture.componentInstance.pendingKey.set(null);
    await fixture.whenStable();

    document
      .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')[1]
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.removed).toEqual(['type']);
    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(1);
  });

  it('should emit fieldRemoved with the chip’s key when its remove button is activated', async () => {
    document
      .querySelector<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.removed).toEqual(['status']);
  });

  it('should hide "Clear filters" with no active narrowing, and show it once one is set', () => {
    expect(byTestId('widgets-clear-filters')).not.toBeNull();

    fixture.componentInstance.activeKeys.set([]);
    fixture.detectChanges();

    expect(byTestId('widgets-clear-filters')).toBeNull();
  });

  it('should emit filtersCleared when "Clear filters" is activated', async () => {
    byTestId('widgets-clear-filters')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.cleared).toBe(1);
  });

  describe('operator segment', () => {
    it('should default an active field with no activeOperators entry to its own first declared operator', () => {
      const operatorSegment: HTMLElement | null = document.querySelector(
        '[data-testid="widgets-filter-chip-operator"]',
      );

      expect(operatorSegment?.textContent?.trim()).toBe('is');
    });

    it('should read the operator bound through activeOperators rather than the field default', async () => {
      fixture.componentInstance.activeKeys.set(['type']);
      fixture.componentInstance.activeOperators.set({ type: 'notEquals' });
      await fixture.whenStable();

      const operatorSegment: HTMLElement | null = document.querySelector(
        '[data-testid="widgets-filter-chip-operator"]',
      );

      expect(operatorSegment?.textContent?.trim()).toBe('is not');
    });

    it('should emit operatorChanged carrying the field key alongside the picked operator', async () => {
      fixture.componentInstance.activeKeys.set(['type']);
      await fixture.whenStable();

      document
        .querySelector<HTMLButtonElement>('[data-testid="widgets-filter-chip-operator"] button')
        ?.click();
      await fixture.whenStable();

      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
        .find((option) => option.textContent?.trim() === 'is not')
        ?.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.operatorChanges).toEqual([
        { key: 'type', operator: 'notEquals' },
      ]);
    });
  });

  describe('display order', () => {
    async function pickFieldByLabel(label: string): Promise<void> {
      await openAddList();
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="widgets-filters-add-option"]'),
      )
        .find((option) => option.textContent?.trim() === label)
        ?.click();
      await fixture.whenStable();
    }

    it('should render a field picked from the "+ Filter" menu last, after the narrowings already active', async () => {
      fixture.componentInstance.activeKeys.set(['status']);
      await fixture.whenStable();

      await pickFieldByLabel('Type');

      expect(renderedChipMarkers()).toEqual(['status-value', 'type-value']);
    });

    it('should order picked fields by when they were picked, not by the catalog', async () => {
      fixture.componentInstance.activeKeys.set([]);
      await fixture.whenStable();

      await pickFieldByLabel('Type');
      fixture.componentInstance.activeKeys.set(['type']);
      fixture.componentInstance.pendingKey.set(null);
      await fixture.whenStable();

      await pickFieldByLabel('Status');

      expect(renderedChipMarkers()).toEqual(['type-value', 'status-value']);
    });

    it('should send a re-picked field back to the end rather than to its earlier catalog position', async () => {
      fixture.componentInstance.activeKeys.set([]);
      await fixture.whenStable();
      await pickFieldByLabel('Status');
      fixture.componentInstance.activeKeys.set(['status']);
      fixture.componentInstance.pendingKey.set(null);
      await fixture.whenStable();
      await pickFieldByLabel('Type');
      fixture.componentInstance.activeKeys.set(['status', 'type']);
      fixture.componentInstance.pendingKey.set(null);
      await fixture.whenStable();

      expect(renderedChipMarkers()).toEqual(['status-value', 'type-value']);

      document
        .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')[0]
        ?.click();
      fixture.componentInstance.activeKeys.set(['type']);
      await fixture.whenStable();
      await pickFieldByLabel('Status');
      fixture.componentInstance.activeKeys.set(['status', 'type']);
      fixture.componentInstance.pendingKey.set(null);
      await fixture.whenStable();

      expect(renderedChipMarkers()).toEqual(['type-value', 'status-value']);
    });
  });

  describe('focus after removal', () => {
    it('should move focus to the following chip once the removed one leaves the row', async () => {
      fixture.componentInstance.activeKeys.set(['status', 'type']);
      await fixture.whenStable();

      document
        .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')[0]
        ?.click();
      await fixture.whenStable();

      const remaining = document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="widgets-filter-chip-remove"]',
      );
      expect(remaining.length).toBe(1);
      expect(document.activeElement).toBe(remaining[0]);
    });

    it('should move focus to the preceding chip when the removed one was last', async () => {
      fixture.componentInstance.activeKeys.set(['status', 'type']);
      await fixture.whenStable();

      document
        .querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')[1]
        ?.click();
      await fixture.whenStable();

      const remaining = document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="widgets-filter-chip-remove"]',
      );
      expect(remaining.length).toBe(1);
      expect(document.activeElement).toBe(remaining[0]);
    });

    it('should move focus to the "+ Filter" trigger when no chip is left but fields remain unset', async () => {
      document
        .querySelector<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')
        ?.click();
      await fixture.whenStable();

      expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(0);
      expect(document.activeElement).toBe(byTestId('widgets-filters-add'));
    });

    it('should move focus to the bar\'s own root when neither a sibling chip nor the "+ Filter" trigger is left', async () => {
      const singleFieldFixture: ComponentFixture<CollectionFilterBarSingleFieldHost> =
        TestBed.createComponent(CollectionFilterBarSingleFieldHost);
      await singleFieldFixture.whenStable();

      (singleFieldFixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')
        ?.click();
      await singleFieldFixture.whenStable();

      const root: HTMLElement | null = (
        singleFieldFixture.nativeElement as HTMLElement
      ).querySelector('[data-testid="widgets-filter-chips"]');
      expect(document.activeElement).toBe(root);
    });
  });

  describe('operator trigger id', () => {
    it('should give two chips of different keys two distinct ids, stable across separate fixtures', async () => {
      const first: ComponentFixture<CollectionFilterBarOperatorIdHost> = TestBed.createComponent(
        CollectionFilterBarOperatorIdHost,
      );
      await first.whenStable();
      const firstIds: readonly string[] = operatorTriggerIds(first.nativeElement as HTMLElement);

      expect(firstIds).toEqual([
        'widgets-filter-chip-operator-status',
        'widgets-filter-chip-operator-type',
      ]);
      expect(new Set(firstIds).size).toBe(2);

      const second: ComponentFixture<CollectionFilterBarOperatorIdHost> = TestBed.createComponent(
        CollectionFilterBarOperatorIdHost,
      );
      await second.whenStable();

      expect(operatorTriggerIds(second.nativeElement as HTMLElement)).toEqual(firstIds);
    });
  });

  describe('unavailable field guard', () => {
    it('should describe an unavailable field with its reason, resolved by aria-describedby', async () => {
      const unavailableFixture: ComponentFixture<CollectionFilterBarUnavailableFieldHost> =
        TestBed.createComponent(CollectionFilterBarUnavailableFieldHost);
      await unavailableFixture.whenStable();

      const root: HTMLElement = unavailableFixture.nativeElement as HTMLElement;
      root.querySelector<HTMLButtonElement>('[data-testid="widgets-filters-add"]')?.click();
      await unavailableFixture.whenStable();

      const archivedOption: HTMLButtonElement | undefined = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]'),
      ).find(
        (option: HTMLButtonElement): boolean => option.textContent?.includes('Archived') ?? false,
      );
      const describedBy: string | null = archivedOption?.getAttribute('aria-describedby') ?? null;
      const reason: HTMLElement | null = describedBy ? document.getElementById(describedBy) : null;

      expect(reason?.textContent).toContain('Not available on this view.');
    });

    it('should mark an unavailable field’s "+ Filter" entry aria-disabled on the actual button, surviving CdkMenuItem’s own competing binding', async () => {
      const unavailableFixture: ComponentFixture<CollectionFilterBarUnavailableFieldHost> =
        TestBed.createComponent(CollectionFilterBarUnavailableFieldHost);
      await unavailableFixture.whenStable();

      const root: HTMLElement = unavailableFixture.nativeElement as HTMLElement;
      root.querySelector<HTMLButtonElement>('[data-testid="widgets-filters-add"]')?.click();
      await unavailableFixture.whenStable();

      const options: HTMLButtonElement[] = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]'),
      );
      const archivedOption: HTMLButtonElement | undefined = options.find(
        (option: HTMLButtonElement): boolean => option.textContent?.includes('Archived') ?? false,
      );
      const availableOption: HTMLButtonElement | undefined = options.find(
        (option: HTMLButtonElement): boolean => option.textContent?.includes('Archived') === false,
      );

      expect(archivedOption?.getAttribute('aria-disabled')).toBe('true');
      expect(availableOption?.getAttribute('aria-disabled')).toBe('false');
    });

    it('should refuse to pick a field carrying unavailableReason, leaving it un-rendered as a chip', async () => {
      const unavailableFixture: ComponentFixture<CollectionFilterBarUnavailableFieldHost> =
        TestBed.createComponent(CollectionFilterBarUnavailableFieldHost);
      await unavailableFixture.whenStable();

      const root: HTMLElement = unavailableFixture.nativeElement as HTMLElement;
      root.querySelector<HTMLButtonElement>('[data-testid="widgets-filters-add"]')?.click();
      await unavailableFixture.whenStable();

      const archivedOption: HTMLButtonElement | undefined = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-testid="widgets-filters-add-option"]'),
      ).find(
        (option: HTMLButtonElement): boolean => option.textContent?.includes('Archived') ?? false,
      );

      archivedOption?.click();
      await unavailableFixture.whenStable();

      expect(unavailableFixture.componentInstance.picked).toEqual([]);
      expect(root.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(0);
    });
  });

  describe('unavailable active field', () => {
    it("should render the field's reason inside its own chip, in full, rather than in the value trigger", async () => {
      const activeFixture: ComponentFixture<CollectionFilterBarUnavailableActiveFieldHost> =
        TestBed.createComponent(CollectionFilterBarUnavailableActiveFieldHost);
      await activeFixture.whenStable();

      const reason: HTMLElement | null = (activeFixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="widgets-filter-chip-reason"]',
      );

      expect(reason?.textContent?.trim()).toBe('Not available on this view.');
    });

    it("should describe the chip's remove button by that same reason through aria-describedby", async () => {
      const activeFixture: ComponentFixture<CollectionFilterBarUnavailableActiveFieldHost> =
        TestBed.createComponent(CollectionFilterBarUnavailableActiveFieldHost);
      await activeFixture.whenStable();

      const root: HTMLElement = activeFixture.nativeElement as HTMLElement;
      const removeButton: HTMLButtonElement | null = root.querySelector(
        '[data-testid="widgets-filter-chip-remove"]',
      );
      const describedBy: string | null = removeButton?.getAttribute('aria-describedby') ?? null;
      const reason: HTMLElement | null = describedBy ? document.getElementById(describedBy) : null;

      expect(reason?.textContent).toContain('Not available on this view.');
    });
  });
});
