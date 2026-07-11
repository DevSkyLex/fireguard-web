import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import type { BoardColumn } from '../board';
import { GroupedListHeaderDirective } from './grouped-list-header.directive';
import { GroupedListRowDirective } from './grouped-list-row.directive';
import type { GroupedListHeaderContext, GroupedListRowContext } from './models';

/**
 * Component GroupedList
 * @class GroupedList
 *
 * @description
 * Generic, domain-agnostic stacked list of collapsible sections. Reuses
 * {@link BoardColumn} as its group shape (a section is just a column
 * rendered as a list instead of a drag-drop lane). Unlike {@link Board},
 * rows are plain — no drag-drop. Section header and row markup are supplied
 * by the consumer through the `[appGroupedListHeader]` and
 * `[appGroupedListRow]` projected templates; the list carries no business
 * knowledge.
 *
 * @example ```html
 * <app-grouped-list [groups]="groups()" [itemId]="idOf" (rowClicked)="open($event)">
 *   <ng-template appGroupedListHeader let-group let-count="count">{{ group.id }} ({{ count }})</ng-template>
 *   <ng-template appGroupedListRow let-item>{{ item.title }}</ng-template>
 * </app-grouped-list>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-grouped-list',
  imports: [NgTemplateOutlet],
  templateUrl: './grouped-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupedList<T> {
  //#region Inputs
  /**
   * Property groups
   * @readonly
   *
   * @description
   * Sections to render, each holding its own items in display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly BoardColumn<T>[]>}
   */
  public readonly groups: InputSignal<readonly BoardColumn<T>[]> =
    input.required<readonly BoardColumn<T>[]>();

  /**
   * Property itemId
   * @readonly
   *
   * @description
   * Resolves a stable identifier for an item, used for row tracking.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<(item: T) => string>}
   */
  public readonly itemId: InputSignal<(item: T) => string> = input.required<(item: T) => string>();

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * Whether sections can be collapsed at all. When `false`, every section
   * always renders expanded and no toggle affordance is shown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly collapsible: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property initiallyCollapsed
   * @readonly
   *
   * @description
   * Predicate deciding whether a section starts collapsed, keyed by group
   * id. Defaults to every section starting expanded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<((columnId: string) => boolean) | undefined>}
   */
  public readonly initiallyCollapsed: InputSignal<((columnId: string) => boolean) | undefined> =
    input<(columnId: string) => boolean>();
  //#endregion

  //#region Content templates
  /**
   * Property headerDirective
   * @readonly
   *
   * @description
   * Projected `[appGroupedListHeader]` directive instance, read to reach its
   * captured `TemplateRef`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<GroupedListHeaderDirective<T> | undefined>}
   */
  private readonly headerDirective: Signal<GroupedListHeaderDirective<T> | undefined> =
    contentChild(GroupedListHeaderDirective) as Signal<GroupedListHeaderDirective<T> | undefined>;

  /**
   * Property rowDirective
   * @readonly
   *
   * @description
   * Projected `[appGroupedListRow]` directive instance, read to reach its
   * captured `TemplateRef`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<GroupedListRowDirective<T> | undefined>}
   */
  private readonly rowDirective: Signal<GroupedListRowDirective<T> | undefined> = contentChild(
    GroupedListRowDirective,
  ) as Signal<GroupedListRowDirective<T> | undefined>;

  /**
   * Property headerTemplate
   * @readonly
   *
   * @description
   * Section-header template, falling back to a built-in header when the
   * consumer projects none.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<GroupedListHeaderContext<T>> | undefined>}
   */
  protected readonly headerTemplate: Signal<TemplateRef<GroupedListHeaderContext<T>> | undefined> =
    computed(() => this.headerDirective()?.templateRef);

  /**
   * Property rowTemplate
   * @readonly
   *
   * @description
   * Row template rendered for each item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<GroupedListRowContext<T>> | undefined>}
   */
  protected readonly rowTemplate: Signal<TemplateRef<GroupedListRowContext<T>> | undefined> =
    computed(() => this.rowDirective()?.templateRef);
  //#endregion

  //#region Outputs
  /**
   * Property rowClicked
   * @readonly
   *
   * @description
   * Emits the item whose row was activated (click or Enter/Space).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<T>}
   */
  public readonly rowClicked: OutputEmitterRef<T> = output<T>();
  //#endregion

  //#region State
  /**
   * Property toggledGroupIds
   * @readonly
   *
   * @description
   * Ids whose collapsed state has been explicitly toggled away from its
   * {@link initiallyCollapsed} starting value. Kept separate from the
   * starting predicate so a later change to `groups` does not reset a user's
   * manual toggle.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly toggledGroupIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());
  //#endregion

  //#region Methods
  /**
   * Method isCollapsed
   *
   * @description
   * Effective collapsed state of a section: its {@link initiallyCollapsed}
   * value, flipped once if the user has toggled it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BoardColumn<T>} group - Section to evaluate.
   * @returns {boolean} Whether the section is currently collapsed.
   */
  protected isCollapsed(group: BoardColumn<T>): boolean {
    const startsCollapsed: boolean = this.initiallyCollapsed()?.(group.id) ?? false;
    const toggled: boolean = this.toggledGroupIds().has(group.id);
    return toggled ? !startsCollapsed : startsCollapsed;
  }

  /**
   * Method toggle
   *
   * @description
   * Flips a section's collapsed state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} groupId - Id of the section to toggle.
   * @returns {void}
   */
  protected toggle(groupId: string): void {
    if (!this.collapsible()) return;
    this.toggledGroupIds.update((ids: ReadonlySet<string>): ReadonlySet<string> => {
      const next: Set<string> = new Set(ids);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  /**
   * Method toggleAriaLabel
   *
   * @description
   * Localized accessible label for a section's collapse/expand affordance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {boolean} collapsed - Current collapsed state of the section.
   * @returns {string} The localized label.
   */
  protected toggleAriaLabel(collapsed: boolean): string {
    return collapsed
      ? $localize`:@@shared.groupedList.expand:Expand section`
      : $localize`:@@shared.groupedList.collapse:Collapse section`;
  }
  //#endregion
}
