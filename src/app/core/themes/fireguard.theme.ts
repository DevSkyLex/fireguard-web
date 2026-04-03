import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import type { Preset } from '@primeuix/themes/types';

/**
 * Theme FireguardTheme
 * @type {Preset}
 *
 * @descriptionF
 * This is the theme for the application.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * providePrimeNG({
 *   theme: {
 *     preset: FireguardTheme,
 *   }
 * })
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FireguardTheme: Preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    },
    colorScheme: {
      dark: {
        formField: {
          borderColor: '{surface.800}',
          hoverBorderColor: '{surface.700}',
        },
        content: {
          borderColor: '{surface.800}',
        }
      }
    }
  },
  components: {
    datatable: {
      row: {
        hoverBackground: '{surface.50}',
      },
      colorScheme: {
        dark: {
          row: {
            hoverBackground: '{surface.800}',
          }
        }
      }
    }
  }
});
