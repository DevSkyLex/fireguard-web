import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component ErrorState
 * @class ErrorState
 *
 * @description
 * Shared error / offline block, the twin of {@link EmptyState}, shown inside
 * tables, dataviews, charts, and panels when a collection or resource fails to
 * load (or is unavailable offline). Renders an icon, a title, an optional
 * description, and an optional projected retry action so a failed load always
 * offers a way forward instead of a dead end. The icon defaults to a warning
 * triangle but stays a plain input so callers can pass `pi-wifi` for an offline
 * state — the failure is conveyed by glyph + text, never colour alone.
 *
 * @example ```html
 * <app-error-state
 *   title="Couldn't load facilities"
 *   description="Check your connection and try again."
 * >
 *   <p-button label="Retry" icon="pi pi-refresh" severity="secondary" (onClick)="reload()" />
 * </app-error-state>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  //#region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class (without the `pi` base class) rendered above the title.
   * Defaults to a warning triangle; pass `pi-wifi` for an offline state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input<string>('pi-exclamation-triangle');

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short headline describing the failure, e.g. `Couldn't load facilities`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional supporting copy explaining the failure or the recovery step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> = input<string>();

  /**
   * Property dense
   * @readonly
   *
   * @description
   * Tightens the block for use inside a card or panel rather than on an
   * otherwise empty page. Matches {@link EmptyState.dense}: a dashboard card
   * reporting that one query failed was rendering a full-page-sized failure
   * notice, which made a single unavailable panel look like the whole screen
   * had fallen over.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly dense: InputSignal<boolean> = input<boolean>(false);
  //#endregion
}
