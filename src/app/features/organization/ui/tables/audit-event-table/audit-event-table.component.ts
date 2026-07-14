import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  numberAttribute,
  OnInit,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule, type ButtonPassThroughOptions } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';
import { EmptyState } from '@shared/components';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/constants';

/**
 * Interface AuditActorTypeOption
 *
 * @description
 * Static option rendered in the actor type filter select.
 */
interface AuditActorTypeOption {
  readonly label: string;
  readonly value: string;
}

/**
 * Component AuditEventTable
 * @class AuditEventTable
 *
 * @description
 * Presentational table component that displays a paginated, lazy-loaded list
 * of organization audit events. It owns local filter draft state (action,
 * actor type, subject type, occurred-at range) and pagination while
 * delegating data loading to the parent page through output emitters. It
 * neither injects the owning `AuditStore` nor calls `AuditEventService`
 * directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-event-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePickerModule,
    DatePipe,
    EmptyState,
    InputTextModule,
    PopoverModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    TableModule,
  ],
  templateUrl: './audit-event-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditEventTable implements OnInit {
  //#region Inputs
  /** Audit event rows currently displayed by the table. */
  public readonly auditEvents: InputSignal<readonly AuditEventOutput[]> =
    input.required<readonly AuditEventOutput[]>();

  /** Total number of audit events matching the current query. */
  public readonly total: InputSignal<number> = input.required<number>();

  /** Whether the audit event list is currently loading. */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /** Whether the current query has no audit event rows. */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /** One-based page restored from the parent route query parameter. */
  public readonly initialPage: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)) },
  );
  //#endregion

  //#region Outputs
  /** Emits normalized filter and pagination options for the parent store. */
  public readonly load: OutputEmitterRef<AuditEventListOptions> = output<AuditEventListOptions>();

  /** Emits the one-based page selected by the user. */
  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  /** Emits the audit event selected for detail display. */
  public readonly viewDetails: OutputEmitterRef<AuditEventOutput> = output<AuditEventOutput>();
  //#endregion

  //#region Properties
  /** Shared `styleClass` for the bordered, full-height card shell wrapping the table. */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;

  /** Shared pass-through options for the table's card shell (body, content, header). */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;

  /**
   * Pass-through bumping the icon-only row action button's hit area to the
   * 44px minimum touch target without growing its compact visual size.
   */
  protected readonly rowActionButtonPt: ButtonPassThroughOptions = {
    root: { class: 'min-h-11 min-w-11' },
  };

  /** Default number of audit event rows per page. */
  protected readonly rows: number = 20;

  /** Page-size choices offered by the paginator. */
  protected readonly rowsPerPageOptions: number[] = [20, 50, 100];

  /** Placeholder collection rendered while loading. */
  protected readonly skeletonItems: undefined[] = Array(this.rows);

  /**
   * Whether the table has completed at least one lazy load. Gates
   * {@link showSkeleton} to the very first load only.
   */
  protected readonly hasLoadedOnce: WritableSignal<boolean> = signal<boolean>(false);

  /** Tracks whether {@link loading} has ever been observed `true`. */
  private hasStartedLoading: boolean = false;

  /** Whether to render skeleton placeholders in place of {@link auditEvents}. */
  protected readonly showSkeleton: Signal<boolean> = computed(
    (): boolean => this.loading() && !this.hasLoadedOnce(),
  );

  /** Known actor type values recorded by the audit ledger. */
  protected readonly actorTypeOptions: AuditActorTypeOption[] = [
    { label: $localize`:@@audit.table.actorTypeUser:User`, value: 'user' },
    { label: $localize`:@@audit.table.actorTypeClient:Client`, value: 'client' },
    { label: $localize`:@@audit.table.actorTypeSystem:System`, value: 'system' },
    { label: $localize`:@@audit.table.actorTypeAnonymous:Anonymous`, value: 'anonymous' },
  ];

  /** Draft value of the "Action" filter, forwarded on {@link onApplyFilters}. */
  protected readonly actionControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft value of the "Actor type" filter, forwarded on {@link onApplyFilters}. */
  protected readonly actorTypeControl: FormControl<string | null> = new FormControl<string | null>(
    null,
  );

  /** Draft value of the "Subject type" filter, forwarded on {@link onApplyFilters}. */
  protected readonly subjectTypeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /** Draft `[from, to]` value of the "Occurred" date-range filter. */
  protected readonly occurredAtControl: FormControl<[Date | null, Date | null] | null> =
    new FormControl<[Date | null, Date | null] | null>(null);

  /** Number of filters currently applied to the table. Drives {@link filterBadge}. */
  private readonly activeFilterCount: WritableSignal<number> = signal<number>(0);

  /** Badge text shown on the "Filters" toolbar button, or `undefined` when unset. */
  protected readonly filterBadge: Signal<string | undefined> = computed((): string | undefined =>
    this.activeFilterCount() > 0 ? String(this.activeFilterCount()) : undefined,
  );

  /** Reference to the popover hosting the filter controls. */
  private readonly filterPopover: Signal<Popover> = viewChild.required<Popover>('filterPopover');

  /** Zero-based row offset consumed by PrimeNG for the current page. */
  protected readonly firstPage: WritableSignal<number> = signal<number>(0);

  /** Whether PrimeNG has emitted the initial lazy-load event. */
  private initialized: boolean = false;

  /** Last lazy-load event reused when filters or refresh trigger a reload. */
  private readonly lastLazyEvent: WritableSignal<TableLazyLoadEvent | null> =
    signal<TableLazyLoadEvent | null>(null);
  //#endregion

  //#region Constructor
  /** Tracks the loading→settled edge that marks the first completed lazy load. */
  public constructor() {
    effect(() => {
      if (this.loading()) {
        this.hasStartedLoading = true;
      } else if (this.hasStartedLoading) {
        this.hasLoadedOnce.set(true);
      }
    });
  }
  //#endregion

  //#region Lifecycle
  /** Converts the restored one-based page input into PrimeNG's zero-based offset. */
  public ngOnInit(): void {
    this.firstPage.set((this.initialPage() - 1) * this.rows);
  }
  //#endregion

  //#region Methods
  /** Handles PrimeNG lazy-load events and emits normalized filter and pagination options. */
  public onLazyLoad(event: TableLazyLoadEvent): void {
    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;

    this.firstPage.set(first);
    this.lastLazyEvent.set(event);
    this.load.emit({ page, itemsPerPage: rowsPerPage, ...this.buildFilters() });

    if (this.initialized) {
      this.pageChange.emit(page);
    }
    this.initialized = true;
  }

  /** Reloads the first page with the current filters. */
  protected onRefresh(): void {
    this.reload();
  }

  /** Opens or closes {@link filterPopover} anchored to the "Filters" toolbar button. */
  protected onFilterToggle(event: Event): void {
    this.filterPopover().toggle(event);
  }

  /** Applies the draft filter controls and reloads the first page. */
  protected onApplyFilters(): void {
    this.activeFilterCount.set(
      (this.actionControl.value.trim() ? 1 : 0) +
        (this.actorTypeControl.value ? 1 : 0) +
        (this.subjectTypeControl.value.trim() ? 1 : 0) +
        (this.hasOccurredAtValue() ? 1 : 0),
    );
    this.filterPopover().hide();
    this.reload();
  }

  /** Clears every draft filter control and reloads the first page. */
  protected onResetFilters(): void {
    this.actionControl.setValue('', { emitEvent: false });
    this.actorTypeControl.setValue(null, { emitEvent: false });
    this.subjectTypeControl.setValue('', { emitEvent: false });
    this.occurredAtControl.setValue(null, { emitEvent: false });
    this.activeFilterCount.set(0);
    this.filterPopover().hide();
    this.reload();
  }

  /** Resolves the PrimeIcons class rendered for an audit event actor type. */
  protected getActorIcon(actorType: string): string {
    switch (actorType) {
      case 'user':
        return 'pi pi-user';
      case 'client':
        return 'pi pi-desktop';
      case 'system':
        return 'pi pi-cog';
      default:
        return 'pi pi-question-circle';
    }
  }

  /** Whether {@link occurredAtControl} carries at least one bound date. */
  private hasOccurredAtValue(): boolean {
    const range: [Date | null, Date | null] | null = this.occurredAtControl.value;
    return !!range && (range[0] != null || range[1] != null);
  }

  /** Builds the typed filter fields sent alongside pagination on every load. */
  private buildFilters(): Omit<AuditEventListOptions, 'page' | 'itemsPerPage'> {
    const action: string = this.actionControl.value.trim();
    const actorType: string | null = this.actorTypeControl.value;
    const subjectType: string = this.subjectTypeControl.value.trim();
    const range: [Date | null, Date | null] | null = this.hasOccurredAtValue()
      ? this.occurredAtControl.value
      : null;

    return {
      ...(action ? { action } : {}),
      ...(actorType ? { actorType } : {}),
      ...(subjectType ? { subjectType } : {}),
      ...(range?.[0] ? { from: this.toIsoStart(range[0]) } : {}),
      ...(range?.[1] ? { to: this.toIsoEnd(range[1]) } : {}),
    };
  }

  /** Converts a date to the ISO 8601 instant marking the start of that day. */
  private toIsoStart(date: Date): string {
    const start: Date = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  /** Converts a date to the ISO 8601 instant marking the end of that day. */
  private toIsoEnd(date: Date): string {
    const end: Date = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }

  /** Replays the last lazy-load event on the first page. */
  private reload(): void {
    this.firstPage.set(0);

    const event: TableLazyLoadEvent = this.lastLazyEvent() ?? { first: 0, rows: this.rows };

    this.onLazyLoad({ ...event, first: 0, rows: event.rows ?? this.rows });
  }
  //#endregion
}
