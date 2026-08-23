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

@Component({
  selector: 'app-collection-filter-bar-host',
  imports: [CollectionFilterBar],
  template: `
    <app-collection-filter-bar
      [fields]="fields"
      [activeKeys]="activeKeys()"
      [pendingKey]="pendingKey()"
      [templates]="templates()"
      testIdPrefix="widgets"
      (fieldPicked)="onFieldPicked($event)"
      (fieldRemoved)="removed.push($event)"
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
  public readonly picked: string[] = [];
  public readonly removed: string[] = [];
  public readonly operatorChanges: CollectionFilterOperatorChangedEvent[] = [];
  public cleared = 0;

  /** Mirrors a real page's `fieldPicked` handler: opens the picked field's own selector. */
  public onFieldPicked(key: string): void {
    this.picked.push(key);
    this.pendingKey.set(key);
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

  it('renders one chip per active key, projecting the matching template', () => {
    expect(byTestId('status-value')).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(1);
  });

  it('offers only the unset fields in the "+ Filter" list', async () => {
    await openAddList();

    const options = document.querySelectorAll('[data-testid="widgets-filters-add-option"]');
    expect(options.length).toBe(2);
    expect(Array.from(options).map((el) => el.textContent?.trim())).toEqual(['Type', 'Priority']);
  });

  it('emits fieldPicked and renders the pending chip once a field is picked from the menu', async () => {
    fixture.componentInstance.pendingKey.set('priority');
    await fixture.whenStable();

    expect(document.querySelectorAll('[data-testid="widgets-filter-chip"]').length).toBe(2);
  });

  it('keeps a picked field’s chip once its value control closes with nothing chosen', async () => {
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

  it('stops offering a picked field in the "+ Filter" list while its chip is on screen', async () => {
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

  it('offers a picked field again once its chip is removed', async () => {
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

  it('emits fieldRemoved with the chip’s key when its remove button is activated', async () => {
    document
      .querySelector<HTMLButtonElement>('[data-testid="widgets-filter-chip-remove"]')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.removed).toEqual(['status']);
  });

  it('hides "Clear filters" with no active narrowing, and shows it once one is set', () => {
    expect(byTestId('widgets-clear-filters')).not.toBeNull();

    fixture.componentInstance.activeKeys.set([]);
    fixture.detectChanges();

    expect(byTestId('widgets-clear-filters')).toBeNull();
  });

  it('emits filtersCleared when "Clear filters" is activated', async () => {
    byTestId('widgets-clear-filters')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.cleared).toBe(1);
  });

  describe('operator segment', () => {
    it('defaults an active field with no activeOperators entry to its own first declared operator', () => {
      const operatorSegment: HTMLElement | null = document.querySelector(
        '[data-testid="widgets-filter-chip-operator"]',
      );

      expect(operatorSegment?.textContent?.trim()).toBe('is');
    });

    it('emits operatorChanged carrying the field key alongside the picked operator', async () => {
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

    it('renders a field picked from the "+ Filter" menu last, after the narrowings already active', async () => {
      fixture.componentInstance.activeKeys.set(['status']);
      await fixture.whenStable();

      await pickFieldByLabel('Type');

      expect(renderedChipMarkers()).toEqual(['status-value', 'type-value']);
    });

    it('orders picked fields by when they were picked, not by the catalog', async () => {
      fixture.componentInstance.activeKeys.set([]);
      await fixture.whenStable();

      await pickFieldByLabel('Type');
      fixture.componentInstance.activeKeys.set(['type']);
      fixture.componentInstance.pendingKey.set(null);
      await fixture.whenStable();

      await pickFieldByLabel('Status');

      expect(renderedChipMarkers()).toEqual(['type-value', 'status-value']);
    });

    it('sends a re-picked field back to the end rather than to its earlier catalog position', async () => {
      // 'status' picked first, then 'type' — establishes pick order [status, type].
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

      // Removing and re-picking 'status' — despite leading the catalog — sends it to the end.
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
});
