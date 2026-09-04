import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCamera,
  lucideCircle,
  lucideCircleCheckBig,
  lucideCircleDot,
  lucideCircleSlash,
  lucideEllipsis,
  lucideFilterX,
  lucideListChecks,
  lucidePlus,
  lucideSkipForward,
  lucideTrash2,
} from '@ng-icons/lucide';
import {
  resolveInterventionTag,
  type InterventionWorkItemOutput,
  type InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import { CollectionSurface } from '@shared/collection-surface';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';
import { HlmToggle } from '@shared/ui/toggle';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { InterventionTag } from '../../components/intervention-tag';
import {
  WORK_ITEM_STATUS_ICON,
  WORK_ITEM_STATUS_ICON_CLASS,
} from './constants/intervention-work-item-appearance.constants';
import type { InterventionWorkItemFilter } from './models/intervention-work-item-filter.type';
import { filterAndGroupInterventionWorkItems } from './utils/intervention-work-item-view/intervention-work-item-view.utils';

/** Placeholder rows drawn while the intervention's own fetch is in flight. */
/**
 * Component InterventionWorkItemTable
 * @class InterventionWorkItemTable
 *
 * @description
 * The field work, as an `hlmTable` grid an operator ticks off. One column per
 * datum — status toggle, item, target, assignee, state badge, origin, row
 * menu — instead of a single stacked cell, on the density `InterventionTable`
 * already sets for §10.3 grids.
 *
 * The status toggle is a 44px target — unconditionally, not `max-sm:`, because
 * the surface is a gloved hand on a tablet. It is the one place this app
 * deliberately goes past its own `size-9` ceiling. Its cell drops `hlmTd`'s
 * default `p-2`: the button already exceeds a normal row's content height, so
 * stacking 8px of padding on every side on top of it (measured: 60px rows
 * against `InterventionTable`'s 44px) was excess chrome, not part of the
 * target — the button's own 44px still renders untouched at `p-0`.
 *
 * @version 2.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-table',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    CollectionSurface,
    HlmBadge,
    HlmToggle,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmDropdownMenuImports,
    ...HlmProgressImports,
    ...HlmSpinnerImports,
    ...HlmTableImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    provideIcons({
      lucideCamera,
      lucideCircle,
      lucideCircleCheckBig,
      lucideCircleDot,
      lucideCircleSlash,
      lucideEllipsis,
      lucideFilterX,
      lucideListChecks,
      lucidePlus,
      lucideSkipForward,
      lucideTrash2,
    }),
  ],
  templateUrl: './intervention-work-item-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The intervention's work items, in the order the API returned them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly items: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the intervention's own fetch is in flight. The detail page gates
   * its whole route on this same signal (`store.loading()`), so a row never
   * actually renders it true — it exists so this table follows the same
   * skeleton-loading dialect as its sibling grids rather than staying the one
   * exception.
   *
   * @access public
   * @since 2.3.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property nextItemId
   * @readonly
   *
   * @description
   * The item the operator should pick up next, or `null` outside execution —
   * a "next" marker while the intervention is still being planned is noise.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly nextItemId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property pendingItemIds
   * @readonly
   *
   * @description
   * Ids of the rows whose own write is in flight, straight from the store's
   * `pendingWorkItemIds`. A set rather than a single id: writes run through
   * `mergeMap`, so several rows may legitimately be saving at once and each
   * must lock only itself.
   *
   * @access public
   * @since 4.2.0
   *
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly pendingItemIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property canToggle
   * @readonly
   * @description Whether the operator may record progress on an item.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canToggle: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canSkip
   * @readonly
   * @description Whether an item may be skipped with a reason.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canSkip: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canDelete
   * @readonly
   * @description Whether a planned item may be removed from the scope.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canDelete: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canAdd
   * @readonly
   * @description Whether the scope may still grow.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canAdd: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property busy
   * @readonly
   *
   * @description
   * Whether any write is in flight. This gates **only** the add affordances,
   * because the sheet they open is modal and a second one would race the first.
   * It deliberately does not gate a row: the store queues work-item writes with
   * `mergeMap` so an operator can tick several items in a row, and locking every
   * toggle on any write would throw that away. A row's own in-flight write is
   * {@link pendingItemIds}.
   *
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly busy: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property currentMemberId
   * @readonly
   *
   * @description
   * The signed-in member's IRI in this organization — the same shape as a work
   * item's own `assignee` — or `null` before the profile resolves. Drives the
   * "Mine first" toggle's availability and its grouping.
   *
   * @access public
   * @since 6.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property totalCount
   * @readonly
   * @description The intervention's full work-item scope, from the aggregate — not just what filtered rows are showing.
   * @access public
   * @since 6.1.0
   * @type {InputSignal<number>}
   */
  public readonly totalCount: InputSignal<number> = input<number>(0);

  /**
   * Property completedCount
   * @readonly
   * @description How many of the scope's items are completed, from the aggregate.
   * @access public
   * @since 6.1.0
   * @type {InputSignal<number>}
   */
  public readonly completedCount: InputSignal<number> = input<number>(0);

  /**
   * Property showProgress
   * @readonly
   *
   * @description
   * Whether the completion bar renders above the table. The page passes this
   * rather than the phase itself, so the table stays free of workflow
   * knowledge — it is told when progress is worth showing, not why.
   *
   * @access public
   * @since 6.1.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly showProgress: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canAttachEvidence
   * @readonly
   *
   * @description
   * Whether a row's evidence affordance is offered, mirroring the page's
   * `canManageAttachments` — the same phase/permission gate that governs the
   * attachments section governs attaching evidence to one work item.
   *
   * @access public
   * @since 5.4.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canAttachEvidence: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property evidencePendingItemIds
   * @readonly
   *
   * @description
   * Ids of the rows whose evidence upload (compression + store write) is in
   * flight, so each row's evidence button locks and spins independently of
   * the others.
   *
   * @access public
   * @since 5.4.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly evidencePendingItemIds: InputSignal<ReadonlySet<string>> = input<
    ReadonlySet<string>
  >(new Set<string>());
  //#endregion

  //#region Outputs
  /**
   * Property statusChanged
   * @readonly
   * @description A recorded change of state for one item.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemStatusChange>}
   */
  public readonly statusChanged: OutputEmitterRef<InterventionWorkItemStatusChange> =
    output<InterventionWorkItemStatusChange>();

  /**
   * Property skipRequested
   * @readonly
   * @description A skip was asked for; the page collects the reason it requires.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly skipRequested: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();

  /**
   * Property deleteRequested
   * @readonly
   * @description A removal was asked for; the page confirms it before acting.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();

  /**
   * Property addRequested
   * @readonly
   * @description The operator wants to add to the scope.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly addRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property evidenceRequested
   * @readonly
   * @description The operator wants to attach evidence to this row; the page opens the photo/file intake.
   * @access public
   * @since 5.4.0
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly evidenceRequested: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();
  //#endregion

  //#region View state
  /**
   * Property activeFilter
   * @readonly
   *
   * @description
   * The active chip. A view preference local to this table, not route state —
   * switching intervention detail pages resets it rather than carrying a stale
   * filter across a different scope.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {WritableSignal<InterventionWorkItemFilter>}
   */
  protected readonly activeFilter: WritableSignal<InterventionWorkItemFilter> =
    signal<InterventionWorkItemFilter>('all');

  /**
   * Property mineFirst
   * @readonly
   * @description Whether the operator's own rows are pulled to the top.
   * @access protected
   * @since 6.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly mineFirst: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  /** One literal Tailwind width per column, handed to the shared surface's skeleton rows. */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'size-11 rounded-full',
    'h-4 w-40 max-w-full',
    'h-4 w-24',
    'h-4 w-28',
    'h-4 w-20',
    'h-4 w-16',
    'ms-auto size-6',
  ];

  /**
   * Property filterCounts
   * @readonly
   * @description How many items each chip would show, over the full scope — read before the operator picks a chip, so it must not depend on {@link activeFilter}.
   * @access protected
   * @since 6.1.0
   * @type {Signal<Readonly<Record<InterventionWorkItemFilter, number>>>}
   */
  protected readonly filterCounts: Signal<Readonly<Record<InterventionWorkItemFilter, number>>> =
    computed<Readonly<Record<InterventionWorkItemFilter, number>>>(() => {
      const items: readonly InterventionWorkItemOutput[] = this.items();

      return {
        all: items.length,
        remaining: filterAndGroupInterventionWorkItems(items, 'remaining', null).length,
        done: filterAndGroupInterventionWorkItems(items, 'done', null).length,
        skipped: filterAndGroupInterventionWorkItems(items, 'skipped', null).length,
      };
    });

  /**
   * Property showMineFirstToggle
   * @readonly
   * @description Whether the "Mine first" toggle has anything to offer — a known member with at least one row assigned to them.
   * @access protected
   * @since 6.1.0
   * @type {Signal<boolean>}
   */
  protected readonly showMineFirstToggle: Signal<boolean> = computed<boolean>(() => {
    const memberId: string | null = this.currentMemberId();

    return memberId !== null && this.items().some((item) => item.assignee === memberId);
  });

  /**
   * Property viewItems
   * @readonly
   *
   * @description
   * The rows the table actually renders: the active chip, then — only while
   * {@link mineFirst} is on and available — the operator's own rows first.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {Signal<readonly InterventionWorkItemOutput[]>}
   */
  protected readonly viewItems: Signal<readonly InterventionWorkItemOutput[]> = computed<
    readonly InterventionWorkItemOutput[]
  >(() =>
    filterAndGroupInterventionWorkItems(
      this.items(),
      this.activeFilter(),
      this.mineFirst() && this.showMineFirstToggle() ? this.currentMemberId() : null,
    ),
  );

  /**
   * Property progressPercent
   * @readonly
   * @description The completion bar's fill, guarded against a zero-sized scope.
   * @access protected
   * @since 6.1.0
   * @type {Signal<number>}
   */
  protected readonly progressPercent: Signal<number> = computed<number>(() => {
    const total: number = this.totalCount();

    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  /**
   * Property progressLabel
   * @readonly
   * @description The completion bar's accessible name, stating the same count the visible text already shows.
   * @access protected
   * @since 6.1.0
   * @type {Signal<string>}
   */
  protected readonly progressLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.wit.progressAriaLabel:${this.completedCount()}:completed: of ${this.totalCount()}:total: items completed`,
  );

  /**
   * Property doneCount
   * @readonly
   * @description How many items are resolved — completed or deliberately skipped.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly doneCount: Signal<number> = computed<number>(
    () =>
      this.items().filter((item) => item.status === 'completed' || item.status === 'skipped')
        .length,
  );

  /**
   * Property emptyDescription
   * @readonly
   *
   * @description
   * What an empty scope says, which depends on whether the reader can do
   * anything about it — telling an operator to add work they have no permission
   * to add is worse than saying nothing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly emptyDescription: Signal<string> = computed<string>(() =>
    this.canAdd()
      ? $localize`:@@intervention.wit.emptyDesc:List the tasks to complete during this intervention.`
      : $localize`:@@intervention.wit.emptyDescReadOnly:A planner has not listed the field work yet.`,
  );
  //#endregion

  //#region Methods
  /**
   * Method iconOf
   * @description The glyph for an item's state.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} The registered icon name.
   */
  protected iconOf(item: InterventionWorkItemOutput): string {
    return WORK_ITEM_STATUS_ICON[item.status];
  }

  /**
   * Method iconClassOf
   * @description The size and tint of an item's glyph.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} Literal Tailwind classes.
   */
  protected iconClassOf(item: InterventionWorkItemOutput): string {
    return WORK_ITEM_STATUS_ICON_CLASS[item.status];
  }

  /**
   * Method isNext
   * @description Whether this is the item the operator should pick up next.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {boolean} True for the next item.
   */
  protected isNext(item: InterventionWorkItemOutput): boolean {
    return this.nextItemId() === item.id;
  }

  /**
   * Method actionLabelOf
   * @description The item's action, resolved to its display label.
   * @access protected
   * @since 2.1.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} The localized action label.
   */
  protected actionLabelOf(item: InterventionWorkItemOutput): string {
    return resolveInterventionTag('workItemAction', item.action).label;
  }

  /**
   * Method targetLabelOf
   *
   * @description
   * The resource the item targets, when the API resolved one. A free-text
   * target is shown as typed; a bare IRI is not, because it names nothing to
   * a reader.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   *
   * @returns {string | null} The target's display label, or null when there is none to show.
   */
  protected targetLabelOf(item: InterventionWorkItemOutput): string | null {
    const summary: string | undefined = item.targetSummary?.label;
    if (summary) return summary;

    // API Platform omits null fields, so an unset target arrives as `undefined`.
    const raw: string | null | undefined = item.target;

    return !raw || raw.startsWith('/api/') ? null : raw;
  }

  /**
   * Method assigneeInitialsOf
   * @description Avatar fallback initials derived from the assignee's display name.
   * @access protected
   * @since 2.1.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} Up to two uppercase initials, or an empty string when unassigned.
   */
  protected assigneeInitialsOf(item: InterventionWorkItemOutput): string {
    const name: string | undefined = item.assigneeProfile?.displayName;
    if (!name) return '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Method sourceLabelOf
   * @description Whether the item was scoped up front or found in the field.
   * @access protected
   * @since 2.1.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} A localized origin label.
   */
  protected sourceLabelOf(item: InterventionWorkItemOutput): string {
    return item.source === 'discovered'
      ? $localize`:@@intervention.wit.sourceDiscovered:Discovered`
      : $localize`:@@intervention.wit.sourcePlanned:Planned`;
  }

  /**
   * Method canToggleItem
   *
   * @description
   * Whether this row's toggle is live. A skipped item is not toggled back — it
   * was resolved with a reason, and undoing that is a deliberate act the skip
   * flow owns.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   *
   * @returns {boolean} True when the toggle should act.
   */
  protected canToggleItem(item: InterventionWorkItemOutput): boolean {
    return this.canToggle() && item.status !== 'skipped';
  }

  /**
   * Method isRowPending
   *
   * @description
   * Whether this row's own write is in flight. Only this row is locked and only
   * this row shows a spinner, so ticking one item never blocks the next.
   *
   * @access protected
   * @since 4.1.0
   *
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {boolean} True while this row is saving.
   */
  protected isRowPending(item: InterventionWorkItemOutput): boolean {
    return this.pendingItemIds().has(item.id);
  }

  /**
   * Method canSkipItem
   * @description Whether this row may still be skipped.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {boolean} True when a skip is offered.
   */
  protected canSkipItem(item: InterventionWorkItemOutput): boolean {
    return this.canSkip() && item.status !== 'completed' && item.status !== 'skipped';
  }

  /**
   * Method canDeleteItem
   *
   * @description
   * Whether this row may be removed. Only planned work is removable; a
   * discovered item records something an operator actually found in the field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   *
   * @returns {boolean} True when a removal is offered.
   */
  protected canDeleteItem(item: InterventionWorkItemOutput): boolean {
    return this.canDelete() && item.source === 'planned';
  }

  /**
   * Method hasRowActions
   * @description Whether the overflow menu has anything to offer for this row.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {boolean} True when the menu should render.
   */
  protected hasRowActions(item: InterventionWorkItemOutput): boolean {
    return this.canSkipItem(item) || this.canDeleteItem(item);
  }

  /**
   * Method isEvidencePending
   * @description Whether this row's own evidence upload is in flight.
   * @access protected
   * @since 5.4.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {boolean} True while this row's evidence upload is pending.
   */
  protected isEvidencePending(item: InterventionWorkItemOutput): boolean {
    return this.evidencePendingItemIds().has(item.id);
  }

  /**
   * Method evidenceLabelOf
   * @description The evidence button's accessible name, stating the current count when there is one.
   * @access protected
   * @since 5.4.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} A localized label.
   */
  protected evidenceLabelOf(item: InterventionWorkItemOutput): string {
    return item.evidenceCount > 0
      ? $localize`:@@intervention.wit.evidenceCount:Attach evidence — ${item.evidenceCount}:count: file(s) attached`
      : $localize`:@@intervention.wit.evidenceEmpty:Attach evidence`;
  }

  /**
   * Method toggleLabelOf
   * @description The toggle's accessible name. For an actionable row it states what the press does; for a `skipped` row the control is disabled, so the name states the state instead of promising a "Complete" that will never fire.
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   * @returns {string} A localized action label.
   */
  protected toggleLabelOf(item: InterventionWorkItemOutput): string {
    const target: string | null = this.targetLabelOf(item);
    const label: string = target
      ? `${this.actionLabelOf(item)} · ${target}`
      : this.actionLabelOf(item);

    if (item.status === 'skipped') {
      return $localize`:@@intervention.wit.skippedLabel:Skipped: ${label}:item:`;
    }

    return item.status === 'completed'
      ? $localize`:@@intervention.wit.reopen:Reopen ${label}:item:`
      : $localize`:@@intervention.wit.complete:Complete ${label}:item:`;
  }

  /**
   * Method toggle
   *
   * @description
   * Records progress. A completed item goes back to planned; anything else
   * moves to completed, which is the one gesture the field surface needs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - The item being toggled.
   *
   * @returns {void}
   */
  protected toggle(item: InterventionWorkItemOutput): void {
    if (!this.canToggleItem(item)) return;

    this.statusChanged.emit({
      workItemId: item.id,
      status: item.status === 'completed' ? 'planned' : 'completed',
    });
  }

  /**
   * Method onFilterChanged
   * @description Narrows `hlm-toggle-group`'s single-select payload down to a known chip, falling back to `all` for anything else.
   * @access protected
   * @since 6.1.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   * @returns {void}
   */
  protected onFilterChanged(value: string | readonly string[] | null | undefined): void {
    const filter: InterventionWorkItemFilter =
      value === 'remaining' || value === 'done' || value === 'skipped' ? value : 'all';

    this.activeFilter.set(filter);
  }
  //#endregion
}
