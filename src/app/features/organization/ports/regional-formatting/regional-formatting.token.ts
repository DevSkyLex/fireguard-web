import { InjectionToken } from '@angular/core';
import type { RegionalFormattingPort } from './regional-formatting.interface';

/**
 * Constant REGIONAL_FORMATTING_PORT
 * @const REGIONAL_FORMATTING_PORT
 *
 * @description
 * Injection token for the RegionalFormattingPort.
 * Feature-owned: bound by `features/organization` providers.
 * Consumed by `shared` UI such as `OrgDatePipe` call sites.
 *
 * @type {InjectionToken<RegionalFormattingPort>}
 */
export const REGIONAL_FORMATTING_PORT: InjectionToken<RegionalFormattingPort> =
  new InjectionToken<RegionalFormattingPort>('REGIONAL_FORMATTING_PORT');
