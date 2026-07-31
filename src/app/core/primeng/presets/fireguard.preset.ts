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
      50: '{red.50}',
      100: '{red.100}',
      200: '{red.200}',
      300: '{red.300}',
      400: '{red.400}',
      500: '{red.500}',
      600: '{red.600}',
      700: '{red.700}',
      800: '{red.800}',
      900: '{red.900}',
      950: '{red.950}',
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
          color: '{primary.600}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        formField: {
          shadow: 'none',
        },
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
            background: '{surface.900}',
          },
        },
      },
      root: {
        shadow: 'none',
      },
      body: {
        padding: '1.25rem',
        gap: '0.75rem',
      },
      title: {
        fontSize: '0.9375rem',
        fontWeight: '600',
      },
    },
    datatable: {
      colorScheme: {
        light: {
          row: {
            background: '{surface.0}',
            stripedBackground: '{surface.50}',
            hoverBackground: '{surface.100}',
          },
          headerCell: {
            background: '{surface.0}',
            color: '{surface.500}',
          },
        },
        dark: {
          row: {
            background: '{surface.900}',
            stripedBackground: '{surface.800}',
            hoverBackground: '{surface.800}',
          },
          headerCell: {
            background: '{surface.900}',
            color: '{surface.400}',
          },
        },
      },
      headerCell: {
        padding: '0.875rem 1.25rem 0.625rem',
      },
      bodyCell: {
        padding: '0.75rem 1.25rem',
      },
      columnTitle: {
        fontWeight: '600',
      },
    },
    editor: {
      css: `
/*
 * Quill ships its own type stack — Helvetica at 13px — which the editor would
 * otherwise wear in the middle of an Inter interface: the composer's text did
 * not match the messages sitting directly above it. Only the typography is
 * reset here; colours, borders and toolbar icons all come from the editor's
 * design tokens.
 *
 * This has to live in the preset rather than at a call site: it is the same
 * correction for every editor in the app, and the composer is not the only one.
 */
.p-editor .ql-container,
.p-editor .ql-editor {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
}

/*
 * The link bubble is the one part of the editor PrimeNG leaves on Quill's own
 * palette — a hard-coded white card with #444 text, which lands as a white
 * rectangle in the middle of a dark workspace. Pointed at the overlay tokens
 * the theme already publishes, it follows the colour scheme like everything
 * else.
 */
.p-editor .ql-snow .ql-tooltip {
    background: var(--p-editor-overlay-background);
    border-color: var(--p-editor-overlay-border-color);
    border-radius: var(--p-editor-overlay-border-radius);
    color: var(--p-editor-overlay-color);
    box-shadow: var(--p-editor-overlay-shadow);
}

.p-editor .ql-snow .ql-tooltip input[type='text'] {
    background: transparent;
    border-color: var(--p-editor-overlay-border-color);
    border-radius: var(--p-editor-overlay-border-radius);
    color: inherit;
}

.p-editor .ql-snow .ql-tooltip a {
    color: var(--p-editor-toolbar-item-hover-color);
}
`,
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
    toast: {
      root: {
        width: 'min(25rem, calc(100vw - 2rem))',
        borderRadius: '10px',
      },
      summary: {
        fontWeight: '650',
      },
    },
  },
});
