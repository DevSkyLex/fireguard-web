import type { ThemeMode } from '@core/theme';

/**
 * Interface ThemeOption
 * @interface ThemeOption
 *
 * @description
 * One selectable appearance: the mode it sets, its registered icon name, and
 * the label the menu shows.
 *
 * @since 1.0.0
 */
export interface ThemeOption {
  /**
   * Property mode
   * @readonly
   *
   * @description
   * Theme mode activated when the operator selects this option.
   *
   * @access public
   * @since unreleased
   *
   * @type {ThemeMode}
   */
  readonly mode: ThemeMode;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered icon name rendered beside the theme label.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized text presented for the selectable theme mode.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;
}
