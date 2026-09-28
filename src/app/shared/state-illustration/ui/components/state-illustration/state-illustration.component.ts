import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { StateIllustrationName } from './models/state-illustration-name.type';

/**
 * Component StateIllustration
 * @class StateIllustration
 * @description
 * Decorative artwork for generic situations — a search or filter miss, restricted access, an
 * all-clear, no selection — following the applied theme through its SSR-safe port. Consumers own
 * the Empty semantics, headings and actions; this component only selects an asset.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-state-illustration',
  templateUrl: './state-illustration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', 'data-testid': 'state-illustration', class: 'max-w-full' },
})
export class StateIllustration {
  //#region Properties
  /**
   * Property state
   * @readonly
   * @description Artwork selected by the owning Empty region.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StateIllustrationName>}
   */
  public readonly state: InputSignal<StateIllustrationName> =
    input.required<StateIllustrationName>();

  /**
   * Property size
   * @readonly
   * @description `md` for page and section regions; `sm` for sheets, dialogs, side panels and cards.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<'sm' | 'md'>}
   */
  public readonly size: InputSignal<'sm' | 'md'> = input<'sm' | 'md'>('md');

  /**
   * Property themePort
   * @readonly
   * @description Applied appearance, including resolved system preference.
   * @access private
   * @since 1.0.0
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject(THEME_PORT);

  /**
   * Property src
   * @readonly
   * @description Only the active variant is requested; no second image or media-query override.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly src: Signal<string> = computed(
    (): string =>
      `/assets/illustrations/empty-states/${this.themePort.resolvedTheme()}/${this.state()}.svg`,
  );
  //#endregion
}
