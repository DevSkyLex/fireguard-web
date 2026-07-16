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
      transitionDuration: '0.18s',
      focusRing: {
        width: '3px',
        style: 'solid',
        color: 'color-mix(in srgb, {primary.500}, transparent 82%)',
        offset: '0',
        shadow: 'none',
      },
    },
    overlay: {
      select: {
        borderRadius: '10px',
        shadow: '0 8px 18px -12px rgba(15, 23, 42, 0.34)',
      },
      popover: {
        borderRadius: '10px',
        shadow: '0 8px 18px -12px rgba(15, 23, 42, 0.34)',
      },
      modal: {
        borderRadius: '12px',
        padding: '1.25rem',
        shadow: '0 24px 60px -28px rgba(15, 23, 42, 0.52)',
      },
      navigation: {
        shadow: '0 8px 18px -12px rgba(15, 23, 42, 0.34)',
      },
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
          placeholderColor: '{surface.600}',
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
        paddingX: '1rem',
        paddingY: '0.625rem',
        gap: '0.5rem',
        iconOnlyWidth: '2.625rem',
        label: { fontWeight: '600' },
        raisedShadow: '0 2px 4px -2px rgba(15, 23, 42, 0.28)',
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
            background: '{surface.900}',
          },
        },
      },
      root: {
        shadow: 'none',
        borderRadius: '12px',
      },
      body: {
        padding: '1.5rem',
        gap: '0.75rem',
      },
      title: {
        fontSize: '1.125rem',
        fontWeight: '650',
      },
    },
    datatable: {
      colorScheme: {
        light: {
          row: {
            background: '{surface.0}',
            stripedBackground: '{surface.50}',
          },
          headerCell: {
            background: '{surface.50}',
          },
        },
        dark: {
          row: {
            background: '{surface.900}',
            stripedBackground: '{surface.800}',
          },
          headerCell: {
            background: '{surface.900}',
          },
        },
      },
      headerCell: {
        padding: '0.75rem 1rem',
      },
      bodyCell: {
        padding: '0.8rem 1rem',
      },
      columnTitle: {
        fontWeight: '650',
      },
    },
    dialog: {
      root: {
        borderRadius: '12px',
      },
      header: {
        padding: '1.25rem 1.5rem',
      },
      content: {
        padding: '0 1.5rem 1.5rem',
      },
      footer: {
        padding: '0 1.5rem 1.5rem',
        gap: '0.75rem',
      },
      title: {
        fontSize: '1.125rem',
        fontWeight: '650',
      },
    },
    drawer: {
      header: {
        padding: '1.25rem 1.5rem',
      },
      content: {
        padding: '0 1.5rem 1.5rem',
      },
      footer: {
        padding: '1.25rem 1.5rem',
      },
      title: {
        fontSize: '1.125rem',
        fontWeight: '650',
      },
    },
    tabs: {
      tab: {
        padding: '0.875rem 1rem',
        fontWeight: '600',
      },
      tabpanel: {
        padding: '1rem 0 0',
      },
      activeBar: {
        height: '2px',
      },
    },
    paginator: {
      root: {
        padding: '0.625rem 0.75rem',
        gap: '0.25rem',
      },
      navButton: {
        width: '2.25rem',
        height: '2.25rem',
        borderRadius: '8px',
      },
    },
    menu: {
      root: {
        borderRadius: '10px',
      },
      item: {
        padding: '0.625rem 0.75rem',
        borderRadius: '7px',
        gap: '0.625rem',
      },
    },
    tag: {
      root: {
        fontSize: '0.75rem',
        fontWeight: '650',
        padding: '0.25rem 0.5rem',
        borderRadius: '6px',
      },
    },
    toast: {
      root: {
        width: 'min(25rem, calc(100vw - 2rem))',
        borderRadius: '10px',
      },
      summary: {
        fontWeight: '650',
      },
    },
    skeleton: {
      root: {
        borderRadius: '8px',
      },
    },
  },
});
