import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import type { Preset } from '@primeuix/themes/types';

/**
 * Theme FireguardTheme
 * @type {Preset}
 *
 * @description
 * The application theme. Appearance is expressed through PrimeNG **design
 * tokens** (the sanctioned extension point) rather than component wrappers or
 * ad-hoc CSS:
 *
 * - `card` — the app's global card identity: no shadow, `surface`-based
 *   background per color scheme, and an `xl` radius. The card **border** has no
 *   PrimeNG token, so it stays a Tailwind class on each `<p-card>` that needs it
 *   (`border border-surface-200 dark:border-surface-800`).
 * - `datatable` — striped/header/row colors per color scheme, plus a single CSS
 *   rule for the sorted header cell (no token exists for it — the theme's only
 *   raw CSS). Tables use PrimeNG's default layout; no per-table `[pt]` layout
 *   overrides.
 * - `formField` / `overlay.select` — no shadow on inputs, selects, textareas or
 *   their overlays (Aura's default subtle drop shadow is disabled per color
 *   scheme).
 *
 * @version 2.0.0
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
      950: '{blue.950}',
    },
    surface: {
      0: '{slate.50}',
      50: '{slate.100}',
      100: '{slate.200}',
      200: '{slate.300}',
      300: '{slate.400}',
      400: '{slate.500}',
      500: '{slate.600}',
      600: '{slate.700}',
      700: '{slate.800}',
      800: '{slate.900}',
      900: '{slate.950}',
    },
    overlay: {
      select: { shadow: 'none' },
    },
    colorScheme: {
      light: {
        formField: { shadow: 'none' },
      },
      dark: {
        formField: { shadow: 'none' },
      },
    },
  },
  components: {
    progressspinner: {
      colorScheme: {
        light: {
          root: {
            colorOne: '{primary.500}',
            colorTwo: '{primary.400}',
            colorThree: '{primary.600}',
            colorFour: '{primary.500}',
          },
        },
        dark: {
          root: {
            colorOne: '{primary.400}',
            colorTwo: '{primary.300}',
            colorThree: '{primary.500}',
            colorFour: '{primary.400}',
          },
        },
      },
    },
    card: {
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
          },
        },
        dark: {
          root: {
            background: '{surface.950}',
          },
        },
      },
      root: {
        shadow: 'none',
        borderRadius: '{border.radius.xl}',
      },
    },
    datatable: {
      colorScheme: {
        light: {
          row: {
            stripedBackground: 'rgba(0, 0, 0, 0.02)',
          },
        },
        dark: {
          row: {
            background: '{surface.950}',
            stripedBackground: 'rgba(255, 255, 255, 0.04)',
          },
          headerCell: {
            background: '{surface.950}',
          },
        },
      },
    },
  },
});
