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
      css: `
        .p-datatable-thead > tr > th.p-datatable-column-sorted {
          background: var(--p-datatable-header-cell-background) !important;
          color: var(--p-datatable-header-cell-color) !important;
        }

        /* base (every variant): compact table body text — was tablePt()'s
           unconditional { table: { class: 'text-sm' } }. */
        app-table-shell .p-datatable-table {
          font-size: 0.875rem;
        }

        /* variant="fill": stretches to the shell's full height, its table
           container scrolling internally with the paginator pinned to the
           bottom-right. */
        app-table-shell[data-variant="fill"] .p-datatable {
          display: flex;
          min-height: 0;
          flex: 1 1 0%;
          flex-direction: column;
        }

        app-table-shell[data-variant="fill"] .p-datatable-table-container {
          min-height: 0;
          flex: 1 1 0%;
          overflow: hidden;
        }

        app-table-shell[data-variant="fill"] .p-datatable-header {
          border-width: 0;
          padding: 0;
          background: var(--p-surface-0);
        }

        app-table-shell[data-variant="fill"] .p-paginator {
          margin-top: auto;
          justify-content: flex-end;
          background: var(--p-surface-0);
        }

        html[data-theme="dark"] app-table-shell[data-variant="fill"] .p-datatable-header,
        html[data-theme="dark"] app-table-shell[data-variant="fill"] .p-paginator {
          background: var(--p-surface-950);
        }

        /* variant="card": a self-contained, non-stretched card. Its own
           border already closes the surface, so the last row's bottom
           border is dropped to avoid a doubled line at the seam. */
        app-table-shell[data-variant="card"] .p-datatable-tbody > tr:last-child > td {
          border-bottom-width: 0;
        }

        /* variant="scroll": a full-width card table whose table container
           scrolls horizontally, keeping its own bottom-rounded, right-aligned
           paginator (the intervention field-work / work-item tables). */
        app-table-shell[data-variant="scroll"] .p-datatable {
          width: 100%;
        }

        app-table-shell[data-variant="scroll"] .p-datatable-table {
          width: 100%;
        }

        app-table-shell[data-variant="scroll"] .p-datatable-table-container {
          overflow-x: auto;
        }

        app-table-shell[data-variant="scroll"] .p-paginator {
          justify-content: flex-end;
          border-radius: 0 0 0.75rem 0.75rem;
          background: var(--p-surface-0);
        }

        html[data-theme="dark"] app-table-shell[data-variant="scroll"] .p-paginator {
          background: var(--p-surface-950);
        }
      `,
    },
  },
});
