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
import type { ResourceIllustrationName } from './models/resource-illustration-name.type';

/**
 * Component ResourceIllustration
 * @class ResourceIllustration
 * @description
 * Decorative artwork following the application's applied theme through its SSR-safe port.
 * Consumers own empty-state semantics, headings and actions; this component only selects an asset.
 * @version 1.0.0
 */
@Component({
  selector: 'app-resource-illustration',
  templateUrl: './resource-illustration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', 'data-testid': 'resource-illustration', class: 'max-w-full' },
})
export class ResourceIllustration {
  //#region Properties
  /**
   * Property resource
   * @readonly
   * @description Artwork selected by the owning collection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ResourceIllustrationName>}
   */
  public readonly resource: InputSignal<ResourceIllustrationName> =
    input.required<ResourceIllustrationName>();

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
      `/assets/illustrations/resources/${this.themePort.resolvedTheme()}/${this.resource()}.svg`,
  );
  //#endregion
}
