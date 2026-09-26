import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type {
  CollectionSelectionAction,
  CollectionSelectionGroup,
} from '@shared/collection-toolbar/models/collection-selection-action.interface';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawer, HlmDrawerImports } from '@shared/ui/drawer';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSeparator } from '@shared/ui/separator';

/**
 * Component CollectionSelectionBar
 * @class CollectionSelectionBar
 * @description Presents owner-provided collection actions in a floating desktop bar or a compact
 * mobile bar and native drawer. It never decides eligibility or performs a business operation.
 * @since 1.0.0
 */
@Component({
  selector: 'app-collection-selection-bar',
  imports: [
    NgIcon,
    HlmButton,
    HlmDrawerImports,
    HlmDropdownMenuImports,
    HlmItemImports,
    HlmSeparator,
  ],
  templateUrl: './collection-selection-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionSelectionBar {
  /**
   * Property selectedCount
   * @readonly
   * @description Number of selected rows on the owner's current loaded page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly selectedCount: InputSignal<number> = input.required<number>();

  /**
   * Property totalResults
   * @readonly
   * @description Optional server result total, separately labeled so it cannot imply cross-page selection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number | null>}
   */
  public readonly totalResults: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property mobileMode
   * @readonly
   * @description Central interaction mode supplied by the owning page, independent of viewport width.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly mobileMode: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property actions
   * @readonly
   * @description Localized, permission-gated commands and groups from the collection owner.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CollectionSelectionAction[]>}
   */
  public readonly actions: InputSignal<readonly CollectionSelectionAction[]> =
    input.required<readonly CollectionSelectionAction[]>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description Stable prefix for browser and component selectors.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();

  /**
   * Property actionRequested
   * @readonly
   * @description Leaf action id emitted immediately on desktop or after the mobile drawer closes.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly actionRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property drawer
   * @readonly
   * @description Native drawer controller used to finish its focus lifecycle before emitting.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmDrawer | undefined>}
   */
  private readonly drawer: Signal<HlmDrawer | undefined> = viewChild<HlmDrawer>(HlmDrawer);

  /**
   * Property queuedActionId
   * @description Mobile action awaiting drawer closure; null for dismissal without an action.
   * @access private
   * @since 1.0.0
   * @type {string | null}
   */
  private queuedActionId: string | null = null;

  /**
   * Property selectionActionsLabel
   * @readonly
   * @description Accessible name of the floating action region.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly selectionActionsLabel: string = $localize`:@@shared.collectionSelection.label:Selection actions`;

  /**
   * Method testId
   * @method testId
   * @description Creates a stable selector under the caller's prefix.
   * @access protected
   * @since 1.0.0
   * @param {string} suffix - Element role or action id.
   * @returns {string} The selector value.
   */
  protected testId(suffix: string): string {
    return `${this.testIdPrefix()}-selection-${suffix}`;
  }

  /**
   * Method requestDesktopAction
   * @method requestDesktopAction
   * @description Emits only a currently enabled leaf command.
   * @access protected
   * @since 1.0.0
   * @param {string} id - Requested command id.
   * @returns {void}
   */
  protected requestDesktopAction(id: string): void {
    if (this.isAvailable(id)) this.actionRequested.emit(id);
  }

  /**
   * Method queueMobileAction
   * @method queueMobileAction
   * @description Holds one enabled command until the native drawer has closed.
   * @access protected
   * @since 1.0.0
   * @param {string} id - Requested command id.
   * @returns {void}
   */
  protected queueMobileAction(id: string): void {
    const drawer = this.drawer();
    if (drawer?.stateComputed() !== 'open' || this.queuedActionId !== null) return;
    if (!this.isAvailable(id)) return;

    this.queuedActionId = id;
    drawer.close();
  }

  /**
   * Method completeMobileAction
   * @method completeMobileAction
   * @description Emits a still-eligible command after the drawer releases focus.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected completeMobileAction(): void {
    const id = this.queuedActionId;
    this.queuedActionId = null;
    if (id !== null && this.isAvailable(id)) this.actionRequested.emit(id);
  }

  /**
   * Method groupEnabled
   * @method groupEnabled
   * @description Whether a group has a command the operator can invoke.
   * @access protected
   * @since 1.0.0
   * @param {CollectionSelectionGroup} group - Owner-provided group and its commands.
   * @returns {boolean} Whether any command is enabled.
   */
  protected groupEnabled(group: CollectionSelectionGroup): boolean {
    return group.disabled !== true && group.actions.some((command) => command.disabled !== true);
  }

  /**
   * Method isAvailable
   * @method isAvailable
   * @description Rechecks count and current owner-provided command state before output.
   * @access private
   * @since 1.0.0
   * @param {string} id - Requested leaf id.
   * @returns {boolean} Whether the leaf is present and enabled.
   */
  private isAvailable(id: string): boolean {
    if (this.selectedCount() <= 0) return false;
    return this.actions().some((entry) =>
      entry.kind === 'command'
        ? entry.id === id && entry.disabled !== true
        : this.groupEnabled(entry) &&
          entry.actions.some((command) => command.id === id && command.disabled !== true),
    );
  }
}
