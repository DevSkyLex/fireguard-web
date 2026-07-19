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
        content: {
          borderColor: '{surface.200}',
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
        content: {
          borderColor: '{surface.800}',
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
        label: { fontWeight: '500' },
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
            shadow: 'none',
          },
        },
        dark: {
          root: {
            background: '{surface.900}',
            shadow: 'none',
          },
        },
      },
      root: {
        borderRadius: '12px',
      },
      body: {
        padding: '1.25rem',
        gap: '0.75rem',
      },
      title: {
        fontSize: '0.9375rem',
        fontWeight: '600',
      },
      // Flat, bordered surfaces: hierarchy comes from surface tints and hairline
      // borders, never from stacked shadows. Shadows stay reserved for overlays
      // (see `semantic.overlay`).
      //
      // `data-shell="table"` is a variant, not a second component: the card
      // becomes a flush, full-height frame whose body scrolls internally and
      // whose header is a divided toolbar. It replaces the former
      // `TABLE_CARD_SHELL_STYLE_CLASS` / `_PT` constants, which every entity
      // table had to import and bind by hand.
      css: `
.p-card {
    border: 1px solid var(--p-content-border-color);
}

.p-card[data-shell='table'] {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
}

.p-card[data-shell='table'] .p-card-body,
.p-card[data-shell='table'] .p-card-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    padding: 0;
}

.p-card[data-shell='table'] .p-card-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--p-content-border-color);
}

@media (min-width: 40rem) {
    .p-card[data-shell='table'] .p-card-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}
`,
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
      css: `
.p-datatable-thead > tr > th {
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
}
`,
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
      // `data-shell="detail"` turns a tabset into the full-height workspace the
      // entity detail pages use: the panel area becomes the page's scroller
      // instead of growing the document. Replaces the `DETAIL_TABS_PT` /
      // `DETAIL_TAB_LIST_PT` / `DETAIL_TAB_PANELS_PT` constants.
      //
      // A variant, not a token change: `organization-members` also renders a
      // tabset and must keep flowing with the page.
      css: `
.p-tabs[data-shell='detail'] {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.p-tabs[data-shell='detail'] .p-tablist-content {
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
}

.p-tabs[data-shell='detail'] .p-tablist-tab-list {
    padding-inline: 1rem;
}

.p-tabs[data-shell='detail'] .p-tabpanels {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 1.5rem 0 0;
}
`,
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
