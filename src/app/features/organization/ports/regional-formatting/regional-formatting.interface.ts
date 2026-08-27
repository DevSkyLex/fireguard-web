import type { Signal } from '@angular/core';
import type { RegionalFormatSettings } from '@shared/regional-format';

/**
 * RegionalFormattingPort
 * @interface RegionalFormattingPort
 *
 * @description
 * Feature-owned port publishing the active organization's regional
 * formatting context to `shared` UI, such as {@link OrgDatePipe}. Always
 * resolves to a usable value — `DEFAULT_REGIONAL_FORMAT_SETTINGS` while no
 * organization is selected or its `settings.regional` is absent — so a
 * consumer never has to null-check before formatting.
 *
 * Concrete implementation: `ActiveOrganizationStore` in
 * `features/organization/state/active-organization/`.
 * Binding: `features/organization/organization.feature.ts`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface RegionalFormattingPort {
  //#region Properties
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, or the neutral
   * default when none is selected yet.
   *
   * @since 1.0.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  readonly regionalFormatting: Signal<RegionalFormatSettings>;
  //#endregion
}
