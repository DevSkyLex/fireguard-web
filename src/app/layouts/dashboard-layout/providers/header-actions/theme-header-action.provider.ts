import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ThemeSwitcher } from '@shared/components';
import { HEADER_ACTION_SLOT } from '../../slots/header-action';

/**
 * Provider provideThemeHeaderAction
 *
 * @description
 * Registers the {@link ThemeSwitcher} component into the dashboard header
 * action slot.
 *
 * @returns {EnvironmentProviders}
 *
 * @since 1.4.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideThemeHeaderAction(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: HEADER_ACTION_SLOT,
      useFactory: () => ({
        id: 'theme-switcher',
        order: 15,
        component: ThemeSwitcher,
      }),
      multi: true,
    },
  ]);
}
