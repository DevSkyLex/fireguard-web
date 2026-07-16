import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import type { Preset } from '@primeuix/themes/types';

/**
 * Theme FireguardTheme
 * @type {Preset}
 *
 * @description
 * The FireguardTheme is a custom theme preset for PrimeNG components,
 * built on top of the Aura theme. It defines a color scheme, semantic colors,
 * and component-specific styles to create a cohesive and visually
 * appealing user interface.
 *
 * @version 4.0.0
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
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
      shadow: 'none',
    },
    formField: {
      paddingX: '0.875rem',
      paddingY: '0.625rem',
      borderRadius: '8px',
      transitionDuration: '0.15s',
      focusRing: {
        width: '3px',
        style: 'solid',
        color: 'color-mix(in srgb, {primary.500}, transparent 82%)',
        offset: '0',
        shadow: 'none',
      },
    },
    overlay: {
      select: { shadow: 'none' },
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{neutral.50}',
          100: '{neutral.100}',
          200: '{neutral.200}',
          300: '{neutral.300}',
          400: '{neutral.400}',
          500: '{neutral.500}',
          600: '{neutral.600}',
          700: '{neutral.700}',
          800: '{neutral.800}',
          900: '{neutral.900}',
          950: '{neutral.950}',
        },
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
        formField: {
          shadow: 'none',
          borderColor: '{surface.200}',
          hoverBorderColor: '{surface.300}',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '{red.600}',
          placeholderColor: '{surface.500}',
        },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '{neutral.50}',
          100: '{neutral.100}',
          200: '{neutral.200}',
          300: '{neutral.300}',
          400: '{neutral.400}',
          500: '{neutral.500}',
          600: '{neutral.600}',
          700: '{neutral.700}',
          800: '{neutral.800}',
          900: '{neutral.900}',
          950: '{neutral.950}',
        },
        primary: {
          color: '{primary.400}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        formField: {
          shadow: 'none',
          background: '{surface.900}',
          borderColor: '{surface.700}',
          hoverBorderColor: '{surface.600}',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '{red.400}',
          placeholderColor: '{surface.400}',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '8px',
        paddingX: '1.125rem',
        paddingY: '0.625rem',
        label: { fontWeight: '600' },
      },
    },
    inputtext: {
      css: `
.p-inputtext.p-invalid:enabled:focus {
    border-color: var(--p-inputtext-invalid-border-color);
    outline-color: color-mix(in srgb, var(--p-inputtext-invalid-border-color), transparent 78%);
}
`,
    },
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
