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
      50: '{orange.50}',
      100: '{orange.100}',
      200: '{orange.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}',
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
      css: `
        /* Sorted header cells keep the plain header background. PrimeNG has no
           token for the sorted-column header, so this single rule is the theme's
           only raw CSS — every other appearance is a token. */
        .p-datatable-thead > tr > th.p-datatable-column-sorted {
          background: var(--p-datatable-header-cell-background) !important;
          color: var(--p-datatable-header-cell-color) !important;
        }
      `,
    },
  },
});
