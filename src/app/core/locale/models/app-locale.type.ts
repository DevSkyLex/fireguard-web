/**
 * Type AppLocaleSubPath
 * @type {AppLocaleSubPath}
 *
 * @description
 * URL sub-path segment identifying a locale served by the build-time
 * `@angular/localize` pipeline (one compiled bundle per locale, served under
 * `/en`, `/fr`, `/es`). This is the canonical identifier used across the app
 * for the active display language, not the framework `LOCALE_ID`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type AppLocaleSubPath = 'en' | 'fr' | 'es';

/**
 * Interface AppLocaleOption
 * @interface AppLocaleOption
 *
 * @description
 * A selectable display language exposed to the UI. The label is the language
 * endonym (its own name) and is intentionally never translated.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AppLocaleOption {
  /** URL sub-path segment of the locale (`en`, `fr`, `es`). */
  readonly subPath: AppLocaleSubPath;

  /** Endonym shown in the language picker (e.g. `Français`). */
  readonly label: string;

  /** Public path to the locale's flag asset (e.g. `flags/fr.svg`). */
  readonly flag: string;
}
