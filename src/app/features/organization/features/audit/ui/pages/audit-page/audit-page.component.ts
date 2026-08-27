import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideCalendarDays,
  lucideCircleAlert,
  lucideHistory,
  lucideLock,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type {
  AuditActionModule,
  AuditEventOutput,
} from '@features/organization/features/audit/models';
import {
  listAuditActionOptions,
  resolveAuditActionTag,
} from '@features/organization/features/audit/models';
import {
  AuditEventsStore,
  type AuditEventsStoreType,
} from '@features/organization/features/audit/state';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  CollectionFilterBar,
  CollectionFilterDateRange,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterPopoverState,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { AuditEventTable } from '../../tables/audit-event-table';

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first, the verified ceiling last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** The two chips this journal's filter bar renders — the backend's real filter surface, minus the nine params no page exposes yet. */
type AuditFilterKey = 'action' | 'dateRange';

/** One filter combobox option: the raw action id and its resolved presentation. */
interface AuditActionOption {
  readonly value: string;
  readonly label: string;
  readonly module: AuditActionModule;
}

/** One module's group of options, in the order the combobox renders them. */
interface AuditActionOptionGroup {
  readonly module: AuditActionModule;
  readonly moduleLabel: string;
  readonly options: ReadonlyArray<AuditActionOption>;
}

/**
 * Function buildActionOptionGroups
 * @description Groups the full action catalog by module, for the combobox's group headers.
 * @access private
 * @since 1.0.0
 * @returns {ReadonlyArray<AuditActionOptionGroup>} The module-grouped catalog.
 */
function buildActionOptionGroups(): ReadonlyArray<AuditActionOptionGroup> {
  const groups = new Map<AuditActionModule, AuditActionOptionGroup>();

  for (const { value, descriptor } of listAuditActionOptions()) {
    const existing = groups.get(descriptor.module);
    const option: AuditActionOption = { value, label: descriptor.label, module: descriptor.module };

    if (existing) {
      (existing.options as AuditActionOption[]).push(option);
    } else {
      groups.set(descriptor.module, {
        module: descriptor.module,
        moduleLabel: descriptor.moduleLabel,
        options: [option],
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * Component AuditPage
 * @class AuditPage
 *
 * @description
 * Route entry page for the organization audit journal: an action combobox
 * (searchable, grouped by module — 68 entries make a plain select
 * impractical), a date-range picker for the inclusive `from`/`to` window,
 * the event grid, and pagination. There is no sort control and no
 * actor/subject filter, matching the backend's actual filter surface
 * exactly — offering either would fake a narrowing the API cannot serve.
 *
 * A `403` renders a distinct "you need the audit permission" empty state
 * rather than the generic error state, since the read permission
 * (`organization.audit.read`) is not in the default member role.
 *
 * The toolbar follows the shared collection pattern
 * (`app-collection-toolbar` → `app-collection-filter-bar`,
 * `@shared/collection-filters`/`@shared/collection-toolbar`): a search box
 * reaching the backend's free-text `?search=` (action and subject are the
 * text-richest columns this table has), and the action combobox and
 * date-range picker relocated into the filter bar's two chips instead of
 * sitting bare at opposite toolbar edges. Only these two params get a chip —
 * the backend accepts nine more (`actorType`, `subjectId`, `tenantId`, …) that
 * no page exposes yet, a separate decision.
 *
 * The "dateRange" chip renders `app-collection-filter-date-range`
 * (`@shared/collection-filters`), the same component `InterventionsPage` uses
 * for its own date-range chips. The "action" chip stays a hand-rolled
 * `hlm-combobox`: its options are grouped by module through
 * `hlmComboboxGroup`, a shape `CollectionFilterSelect` cannot render, and it
 * is the sole consumer of that shape — below `CLAUDE.md` rule 8's
 * third-consumer threshold for extracting a generic grouped-combobox
 * variant. Both still open on a "+ Filter" pick and close themselves back
 * out through the bar's `state`/`stateChanged` contract
 * ({@link fieldPopoverState}/{@link onFieldPopoverStateChanged}) — the
 * "action" combobox because `HlmCombobox` hosts the very same `BrnPopover`
 * `app-collection-filter-select` wraps, not because it was converted.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-page',
  imports: [
    EmptyState,
    ErrorState,
    AuditEventTable,
    CollectionFilterBar,
    CollectionFilterDateRange,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
    ...HlmComboboxImports,
  ],
  providers: [
    provideIcons({
      lucideActivity,
      lucideCalendarDays,
      lucideCircleAlert,
      lucideHistory,
      lucideLock,
    }),
  ],
  templateUrl: './audit-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose audit journal is listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** The journal dataset, provided by this route. */
  protected readonly store: AuditEventsStoreType = inject<AuditEventsStoreType>(AuditEventsStore);

  /** The full action catalog, grouped by module, for the filter combobox. */
  protected readonly actionGroups: ReadonlyArray<AuditActionOptionGroup> =
    buildActionOptionGroups();

  /** The active action narrowing, or `null` for every action. */
  protected readonly action: WritableSignal<string | null> = signal<string | null>(null);

  /** The active `[from, to]` window, or `undefined` for no date narrowing. */
  protected readonly dateRange: WritableSignal<readonly [Date, Date] | undefined> = signal<
    readonly [Date, Date] | undefined
  >(undefined);

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The settled search term the load effect reads, updated once {@link draftSearch} debounces. */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly AuditEventOutput[]> = computed(() =>
    this.store.events(),
  );

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalEvents() / this.pageSize())),
  );

  /** The filter bar's field catalog: the action combobox and the date-range picker, each rendered through its own chip template. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'action',
      fieldLabel: $localize`:@@audit.filter.action:Action`,
      icon: 'lucideActivity',
      operators: ['equals'],
    },
    {
      key: 'dateRange',
      fieldLabel: $localize`:@@audit.filter.dateRange:Date range`,
      icon: 'lucideCalendarDays',
      operators: ['between'],
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   * @description Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input.
   * @access protected
   * @since 2.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const keys: AuditFilterKey[] = [];
      if (this.action() !== null) keys.push('action');
      if (this.dateRange() !== undefined) keys.push('dateRange');

      return keys;
    },
  );

  /** Which field the filter bar currently renders mid-pick, before it carries a value — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<AuditFilterKey | null> =
    signal<AuditFilterKey | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   * @description Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only, seeded by `initialCollectionFilterBarVisibility` then purely driven by `app-collection-filter-toggle`.
   * @access protected
   * @since 2.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** The action combobox, projected into the "action" chip. */
  private readonly actionChipTemplate = viewChild<TemplateRef<unknown>>('actionChip');

  /** The date-range picker, projected into the "dateRange" chip. */
  private readonly dateRangeChipTemplate = viewChild<TemplateRef<unknown>>('dateRangeChip');

  /**
   * Property chipTemplates
   * @readonly
   * @description Each field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 2.0.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    action: this.actionChipTemplate(),
    dateRange: this.dateRangeChipTemplate(),
  }));
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the debounced search round-trip and the load effect over the active
   * organization, filters, search and paging.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    toObservable(this.draftSearch)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        this.page.set(1);
        this.search.set(term);
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const action: string | null = this.action();
      const range: readonly [Date, Date] | undefined = this.dateRange();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const search: string = this.search();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { page, itemsPerPage: pageSize, search: search === '' ? undefined : search },
          query: {
            action: action ?? undefined,
            from: range?.[0]?.toISOString(),
            to: range?.[1]?.toISOString(),
          },
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method actionLabelOf
   * @description Resolves a raw action id to its presentation label, for the combobox trigger.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The raw action id.
   * @returns {string} The resolved label.
   */
  protected actionLabelOf = (value: string): string => resolveAuditActionTag(value).label;

  /**
   * Method applyAction
   * @description Narrows the list to one action, or clears the narrowing. The "action" chip's own popover closes itself on a pick — see {@link onFieldPopoverStateChanged}, the same contract every converted chip in this bar uses.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} value - The combobox's emitted value.
   * @returns {void}
   */
  protected applyAction(value: string | null | undefined): void {
    this.page.set(1);
    this.action.set(value ?? null);
  }

  /**
   * Method applyDateRange
   * @description Narrows the list to an inclusive `[from, to]` window, or clears it. The "dateRange" chip's own popover closes itself on a pick — see {@link onFieldPopoverStateChanged}.
   * @access protected
   * @since 1.0.0
   * @param {readonly [Date, Date] | null | undefined} range - The picker's emitted range.
   * @returns {void}
   */
  protected applyDateRange(range: readonly [Date, Date] | null | undefined): void {
    this.page.set(1);
    this.dateRange.set(range ?? undefined);
  }

  /**
   * Method onSearchQueryChanged
   * @description Records a keystroke into the draft term the debounce watches.
   * @access protected
   * @since 2.0.0
   * @param {string} term - The search box's current value.
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by rendering that field's chip before its own control carries a value.
   * @access protected
   * @since 2.0.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as AuditFilterKey);
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   * @access protected
   * @since 2.0.0
   * @param {string} key - The field key whose chip was removed.
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    if (key === 'action') this.applyAction(null);
    else this.applyDateRange(null);
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 2.0.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   * @description Whether a field's value control should currently render open — the "action" and "dateRange" chips' `state` input.
   * @access protected
   * @since 3.0.0
   * @param {AuditFilterKey} key - The field to resolve.
   * @returns {CollectionFilterPopoverState} `'open'` while {@link openFilterKey} names this field, `'closed'` otherwise.
   */
  protected fieldPopoverState(key: AuditFilterKey): CollectionFilterPopoverState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @description Keeps {@link openFilterKey} in sync with a field's own value control — opened from "+ Filter", closed on a pick, an outside click or Escape.
   * @access protected
   * @since 3.0.0
   * @param {AuditFilterKey} key - The field whose popover changed.
   * @param {CollectionFilterPopoverState} state - Its next state.
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(
    key: AuditFilterKey,
    state: CollectionFilterPopoverState,
  ): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method clearFilters
   * @description Drops every narrowing at once, including the search term.
   * @access protected
   * @since 2.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.action.set(null);
    this.dateRange.set(undefined);
    this.draftSearch.set('');
    this.search.set('');
    this.page.set(1);
  }

  /**
   * Method setPageSize
   * @description Changes the page size and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    const range: readonly [Date, Date] | undefined = this.dateRange();
    const search: string = this.search();

    this.store.load({
      organizationId: this.organizationId(),
      options: {
        page: this.page(),
        itemsPerPage: this.pageSize(),
        search: search === '' ? undefined : search,
      },
      query: {
        action: this.action() ?? undefined,
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      },
    });
  }
  //#endregion
}
