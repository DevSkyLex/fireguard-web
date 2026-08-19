import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideHistory, lucideLock } from '@ng-icons/lucide';
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
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { AuditEventTable } from '../../tables/audit-event-table';

/** The page sizes offered under the table — the server default first, the verified ceiling last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

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
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-page',
  imports: [
    EmptyState,
    ErrorState,
    AuditEventTable,
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideHistory, lucideLock })],
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
  /** The journal dataset, provided by this route. */
  protected readonly store: AuditEventsStoreType = inject<AuditEventsStoreType>(AuditEventsStore);

  /** The full action catalog, grouped by module, for the filter combobox. */
  protected readonly actionGroups: ReadonlyArray<AuditActionOptionGroup> =
    buildActionOptionGroups();

  /** The active action narrowing, or `null` for every action. */
  protected readonly action: WritableSignal<string | null> = signal<string | null>(null);

  /** The active `[from, to]` window, or `undefined` for no date narrowing. */
  protected readonly dateRange: WritableSignal<[Date, Date] | undefined> = signal<
    [Date, Date] | undefined
  >(undefined);

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect over the active organization, filters and paging.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const action: string | null = this.action();
      const range: [Date, Date] | undefined = this.dateRange();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { page, itemsPerPage: pageSize },
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
   * @description Narrows the list to one action, or clears the narrowing.
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
   * @description Narrows the list to an inclusive `[from, to]` window, or clears it.
   * @access protected
   * @since 1.0.0
   * @param {[Date, Date] | null | undefined} range - The picker's emitted range.
   * @returns {void}
   */
  protected applyDateRange(range: [Date, Date] | null | undefined): void {
    this.page.set(1);
    this.dateRange.set(range ?? undefined);
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
    const range: [Date, Date] | undefined = this.dateRange();

    this.store.load({
      organizationId: this.organizationId(),
      options: { page: this.page(), itemsPerPage: this.pageSize() },
      query: {
        action: this.action() ?? undefined,
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      },
    });
  }
  //#endregion
}
