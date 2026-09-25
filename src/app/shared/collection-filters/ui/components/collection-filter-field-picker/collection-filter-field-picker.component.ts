import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawer, HlmDrawerImports } from '@shared/ui/drawer';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import type { CollectionFilterField } from '../../../models';

/**
 * Component CollectionFilterFieldPicker
 * @class CollectionFilterFieldPicker
 * @description Presents unset fields as a desktop menu or mobile drawer. Mobile picks are emitted
 * only after the drawer releases focus.
 * @since 1.0.0
 */
@Component({
  selector: 'app-collection-filter-field-picker',
  imports: [NgIcon, HlmButton, HlmDrawerImports, HlmDropdownMenuImports, HlmItemImports],
  providers: [provideIcons({ lucidePlus })],
  templateUrl: './collection-filter-field-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterFieldPicker {
  /**
   * Property fields
   * @readonly
   * @description Fields not currently rendered as chips.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CollectionFilterField[]>}
   */
  public readonly fields: InputSignal<readonly CollectionFilterField[]> =
    input.required<readonly CollectionFilterField[]>();

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Whether the interaction uses a bottom drawer.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly isMobileInteractionMode: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description Prefix used by browser and component tests.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();

  /**
   * Property triggerLabel
   * @readonly
   * @description Visible trigger label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly triggerLabel: InputSignal<string> = input.required<string>();

  /**
   * Property menuLabel
   * @readonly
   * @description Field catalogue heading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly menuLabel: InputSignal<string> = input.required<string>();

  /**
   * Property fieldPicked
   * @readonly
   * @description Available field selected by the user.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly fieldPicked: OutputEmitterRef<string> = output<string>();

  /**
   * Property queuedKey
   * @description Mobile selection awaiting the drawer's completed close transition.
   * @access private
   * @since 1.0.0
   * @type {string | null}
   */
  private queuedKey: string | null = null;

  /**
   * Property drawer
   * @readonly
   * @description Native drawer controller used to sequence selection and focus release.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmDrawer | undefined>}
   */
  private readonly drawer: Signal<HlmDrawer | undefined> = viewChild<HlmDrawer>(HlmDrawer);

  /**
   * Property trigger
   * @readonly
   * @description Currently rendered menu or drawer trigger.
   * @access private
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Method focusTrigger
   * @method focusTrigger
   * @description Moves focus back to the picker after the final chip is removed.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public focusTrigger(): void {
    this.trigger()?.nativeElement.focus();
  }

  /**
   * Method queueMobileField
   * @method queueMobileField
   * @description Queues one valid field and closes the mobile drawer once.
   * @access protected
   * @since 1.0.0
   * @param {string} key - Field selected in the drawer.
   * @returns {void}
   */
  protected queueMobileField(key: string): void {
    const drawer = this.drawer();
    if (drawer?.stateComputed() !== 'open' || this.queuedKey !== null) return;
    if (!this.isAvailable(key)) return;

    this.queuedKey = key;
    drawer.close();
  }

  /**
   * Method completeMobilePick
   * @method completeMobilePick
   * @description Emits the queued field after the drawer has released focus.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected completeMobilePick(): void {
    const key = this.queuedKey;
    this.queuedKey = null;
    if (key !== null && this.isAvailable(key)) this.fieldPicked.emit(key);
  }

  /**
   * Method pickField
   * @method pickField
   * @description Emits one available desktop menu selection.
   * @access protected
   * @since 1.0.0
   * @param {string} key - Field selected in the menu.
   * @returns {void}
   */
  protected pickField(key: string): void {
    if (this.isAvailable(key)) this.fieldPicked.emit(key);
  }

  /**
   * Method isAvailable
   * @method isAvailable
   * @description Returns whether a field remains present and interactive.
   * @access protected
   * @since 1.0.0
   * @param {string} key - Field key to inspect.
   * @returns {boolean} Whether the field can be selected.
   */
  protected isAvailable(key: string): boolean {
    return this.fields().some(
      (field: CollectionFilterField): boolean =>
        field.key === key && field.unavailableReason === undefined,
    );
  }

  /**
   * Method testId
   * @method testId
   * @description Builds a stable test identifier shared with the owning filter bar.
   * @access protected
   * @since 1.0.0
   * @param {string} suffix - Control-specific identifier suffix.
   * @returns {string} Complete test identifier.
   */
  protected testId(suffix: string): string {
    return `${this.testIdPrefix()}-${suffix}`;
  }

  /**
   * Method reasonIdFor
   * @method reasonIdFor
   * @description Builds the identifier referenced by an unavailable field description.
   * @access protected
   * @since 1.0.0
   * @param {string} key - Unavailable field key.
   * @returns {string} Description identifier.
   */
  protected reasonIdFor(key: string): string {
    return `${this.testIdPrefix()}-filter-reason-${key}`;
  }
}
