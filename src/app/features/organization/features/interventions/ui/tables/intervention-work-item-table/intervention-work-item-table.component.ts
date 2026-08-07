import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircle,
  lucideCircleCheckBig,
  lucideCircleDot,
  lucideCircleSlash,
  lucideEllipsis,
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
import { EmptyState } from '@shared/empty-state';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';
import {
  WORK_ITEM_STATUS_ICON,
  WORK_ITEM_STATUS_ICON_CLASS,
} from './constants/intervention-work-item-appearance.constants';

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
 * @version 2.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-table',
  imports: [
    NgIcon,
    EmptyState,
    HlmBadge,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideCircle,
      lucideCircleCheckBig,
      lucideCircleDot,
      lucideCircleSlash,
      lucideEllipsis,
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
   * Property pendingItemId
   * @readonly
   *
   * @description
   * Which row's own write is in flight. The store has one mutation flag for
   * every write, so the page attributes it to a row rather than spinning the
   * whole list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly pendingItemId: InputSignal<string | null> = input<string | null>(null);

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
   * @description Whether any write is in flight, which locks every toggle.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly busy: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });
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
  //#endregion

  //#region Properties
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
   * Method rowClassOf
   *
   * @description
   * The extra ground the next item's `hlmTableRow` carries — a border only,
   * no fill: a persistent `bg-accent/40` wash read as heavier than the plain
   * rows `InterventionTable` renders, and the "Next" badge plus
   * `aria-current="step"` already keep the marker off colour alone
   * (WCAG 1.4.1) without it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - The item being rendered.
   *
   * @returns {string} Literal Tailwind classes.
   */
  protected rowClassOf(item: InterventionWorkItemOutput): string {
    return this.isNext(item) ? 'border-primary' : '';
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
   * Method toggleLabelOf
   * @description The toggle's accessible name, which states what it will do.
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
  //#endregion
}
