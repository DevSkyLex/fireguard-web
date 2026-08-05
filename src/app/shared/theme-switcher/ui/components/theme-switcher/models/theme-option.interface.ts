import type { ThemeMode } from '@core/theme';

/**
 * Interface ThemeOption
 *
 * @description
 * One selectable appearance: the mode it sets, its registered icon name, and
 * the label the menu shows.
 *
 * @since 1.0.0
 */
export interface ThemeOption {
  readonly mode: ThemeMode;
  readonly icon: string;
  readonly label: string;
}
