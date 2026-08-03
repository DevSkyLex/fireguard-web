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
    /*
     * The brand accent is indigo — the colour of the pivoted "guard" square in
     * the logo, of the PWA `theme_color`, and of the `theme-color` meta tag.
     * It must NOT be the red ramp: red is the app-wide `danger` severity
     * (`shared/tag-severity`) and the invalid form-field border, so a red
     * primary makes a destructive button indistinguishable from a submit
     * button and an invalid field a lighter shade of the primary action.
     */
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
        /*
         * Dark mode lightens the accent instead of reusing the light-mode step.
         * `{primary.600}` (#4f46e5) against the `{surface.950}` label measured
         * 3.15:1 — below the 4.5:1 this product commits to — and it also made
         * the rest/hover pair a three-step jump. `{primary.400}` (#818cf8)
         * measures 6.6:1 and turns rest → hover → active into 400 → 300 → 200.
         */
        primary: {
          color: '{primary.400}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        formField: {
          shadow: 'none',
        },
      },
    },
    /*
     * Aura ships a 1px focus ring. The design system documents a 2px indigo
     * outline offset 2px, and every hand-rolled control in the app already
     * carries `focus-visible:outline-2` — so the two halves of the app
     * disagreed about how thick a focus ring is, and the PrimeNG half was the
     * thinner of the two on a keyboard user's only wayfinding cue.
     *
     * Form fields keep their own zero-width ring (set per colour scheme above):
     * an input signals focus by shifting its border to the accent, which is a
     * deliberate exception, not an oversight.
     */
    focusRing: {
      width: '2px',
      offset: '2px',
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
    /*
     * The toast was the system's one radius outlier at 10px — a value the
     * design document had to carve an explicit exception for. A toast is a
     * large floating container, which the Shapes rule already sizes at
     * `border.radius.xl` (12px), so the exception bought nothing and cost the
     * scale its regularity.
     */
    toast: {
      root: {
        width: 'min(25rem, calc(100vw - 2rem))',
        borderRadius: '{border.radius.xl}',
      },
      summary: {
        fontWeight: '650',
      },
    },

    /*
     * Inline notices, not floating layers. Three Aura defaults fight the
     * design system here:
     *
     * - 16px body text, one step above the app's 14px body, at 177 call sites;
     * - a resting drop shadow, which the Flat-At-Rest Rule reserves for
     *   surfaces that actually dismiss — a message sits in the page flow;
     * - `yellow` for `warn`, where the app's severity vocabulary
     *   (`shared/tag-severity`) is amber, so the same "warning" read as two
     *   different colours depending on which component drew it.
     */
    message: {
      /*
       * `size="small"` is a density variant, not a type step. It carries 117
       * of the app's 177 messages, nearly all of them inline field-validation
       * errors — copy the member has to read and act on. Shrinking it below
       * the 14px body would have meant either 12px error text or reviving the
       * 13px step the type scale retired, so the small variant keeps body size
       * and takes its compactness from Aura's tighter padding instead.
       */
      text: {
        fontSize: '0.875rem',
        fontWeight: '500',
        sm: { fontSize: '0.875rem' },
      },
      icon: {
        size: '1rem',
      },
      colorScheme: {
        light: {
          info: { shadow: 'none' },
          success: { shadow: 'none' },
          warn: {
            background: 'color-mix(in srgb, {amber.50}, transparent 5%)',
            borderColor: '{amber.200}',
            color: '{amber.700}',
            shadow: 'none',
          },
          error: { shadow: 'none' },
          secondary: { shadow: 'none' },
          contrast: { shadow: 'none' },
        },
        dark: {
          info: { shadow: 'none' },
          success: { shadow: 'none' },
          warn: {
            background: 'color-mix(in srgb, {amber.500}, transparent 84%)',
            borderColor: 'color-mix(in srgb, {amber.600}, transparent 64%)',
            color: '{amber.300}',
            shadow: 'none',
          },
          error: { shadow: 'none' },
          secondary: { shadow: 'none' },
          contrast: { shadow: 'none' },
        },
      },
    },

    /*
     * Status chips carry the Label role (12px / 600), not body weight. Aura
     * draws them at 14px / 700 — heavier than any other text in the app and a
     * full step larger than the meta lines they sit on.
     *
     * The severities are realigned onto the documented four-tone vocabulary:
     * Aura reaches for `sky` and `orange`, the app for `blue` and `amber`, so
     * a `p-tag severity="info"` and an `app-tag-severity` "info" rendered two
     * different blues side by side.
     */
    tag: {
      root: {
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.1875rem 0.4375rem',
        gap: '0.25rem',
      },
      icon: {
        size: '0.6875rem',
      },
      colorScheme: {
        light: {
          info: { background: '{blue.100}', color: '{blue.700}' },
          warn: { background: '{amber.100}', color: '{amber.700}' },
        },
        dark: {
          info: {
            background: 'color-mix(in srgb, {blue.500}, transparent 84%)',
            color: '{blue.300}',
          },
          warn: {
            background: 'color-mix(in srgb, {amber.500}, transparent 84%)',
            color: '{amber.300}',
          },
        },
      },
    },

    /*
     * Overlay headings take the Title role (18px / 600), like every other
     * section heading in the app. Aura sizes a drawer title at 24px — the
     * Headline step, which is reserved for a routed page's `h1` — so opening a
     * drawer put a second, larger heading on top of the page that owns it.
     */
    drawer: {
      title: {
        fontSize: '1.125rem',
        fontWeight: '600',
      },
    },
    dialog: {
      title: {
        fontSize: '1.125rem',
        fontWeight: '600',
      },
    },
  },
});
