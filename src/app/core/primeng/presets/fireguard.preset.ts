import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import type { Preset } from '@primeuix/themes/types';

/**
 * Theme FireguardTheme
 * @type {Preset}
 *
 * @description
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
      // PrimeNG ties a sorted column's header text/background AND its sort
      // icon to the same `headerCell.selected*` tokens (see the compiled
      // `.p-datatable-column-sorted` rules in `primeng/table`), so no
      // combination of design tokens can make only the icon go primary. This
      // scoped `css` override — PrimeNG's own sanctioned "additional styles"
      // extension point (`DesignTokens.css`), not `::ng-deep` and not
      // `src/styles.css` — resets the header cell's own color/background back
      // to their unsorted values, leaving the icon rule (untouched, still
      // reading `headerCell.selectedColor`) as the only sorted-state cue.
      css: `
        .p-datatable-thead > tr > th.p-datatable-column-sorted {
          background: var(--p-datatable-header-cell-background) !important;
          color: var(--p-datatable-header-cell-color) !important;
        }
      `,
    },
  },
});
