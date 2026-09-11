import { InjectionToken } from '@angular/core';
import type { SlotPresentation } from './models';

/**
 * Constant SLOT_PRESENTATION
 * @const SLOT_PRESENTATION
 *
 * @description
 * Presentation context inherited by components instantiated through a slot
 * outlet. Contributions remain standalone by default and opt into alternate
 * native anatomy only when an owning layout provides another value.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotPresentation>}
 */
export const SLOT_PRESENTATION: InjectionToken<SlotPresentation> =
  new InjectionToken<SlotPresentation>('SLOT_PRESENTATION', {
    factory: (): SlotPresentation => 'default',
  });
