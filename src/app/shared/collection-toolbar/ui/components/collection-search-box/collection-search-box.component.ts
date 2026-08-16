import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { HlmInputGroupImports } from '@shared/ui/input-group';

/**
 * Component CollectionSearchBox
 * @class CollectionSearchBox
 *
 * @description
 * The search box shared by every collection surface's toolbar: a search
 * icon, a `type="search"` input, and nothing else. Presentational
 * (`ARCHITECTURE.md` §10.3) — it holds no debounce and touches no URL; it
 * takes the current draft value as an input and emits {@link queryChanged}
 * on every keystroke, leaving the debounce and the `?q=` round-trip to the
 * owning page (route orchestration, §10.3). Fixed at `w-full sm:w-72`
 * because every call site sized it identically before this extraction.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-search-box',
  imports: [NgIcon, ...HlmInputGroupImports],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './collection-search-box.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionSearchBox {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description The draft search term the input currently displays.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property placeholder
   * @readonly
   * @description The page-owned, localized placeholder text.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input.required<string>();

  /**
   * Property ariaLabel
   * @readonly
   * @description The page-owned, localized accessible name for the input.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input.required<string>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description The owning list page's `data-testid` prefix (e.g. `equipments`). The input's `data-testid` is `<prefix>-search`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property queryChanged
   * @readonly
   * @description Fires with the input's current value on every keystroke.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly queryChanged: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property testId
   * @readonly
   * @description The `<prefix>-search` `data-testid` value built from {@link testIdPrefix}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly testId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-search`,
  );
  //#endregion

  //#region Methods
  /**
   * Method onInput
   * @description Emits {@link queryChanged} with the native input's current value.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The input event.
   * @returns {void}
   */
  protected onInput(event: Event): void {
    this.queryChanged.emit((event.target as HTMLInputElement).value);
  }
  //#endregion
}
