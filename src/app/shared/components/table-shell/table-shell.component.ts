import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  type InputSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';

/**
 * Type TableShellVariant
 * @typedef TableShellVariant
 *
 * @description
 * Layout variant of the {@link TableShell} card chrome. Reflected verbatim on
 * the host's `data-variant` attribute, which is the scoping hook the
 * `components.datatable.css` extension in `FireguardTheme`
 * (`core/primeng/presets/fireguard.preset.ts`) uses to style the projected
 * `<p-table>` per variant — the shell itself carries no table layout classes.
 *
 * - `fill` — stretches to fill its parent's height, with the table container
 *   scrolling internally and the paginator pinned to the bottom. Use for
 *   full-page entity listings (facilities, equipments, interventions, …).
 * - `card` — a self-contained, non-stretched card. Use for tables composed
 *   inside another layout (member/invitation lists) that render their own
 *   external `p-paginator` below the card.
 * - `scroll` — a self-contained, non-stretched card like `card`, whose inner
 *   table scrolls horizontally instead of wrapping and keeps its own
 *   bottom-rounded, right-aligned internal paginator (the intervention
 *   field-work / work-item tables).
 *
 * @access public
 * @since 1.0.0
 */
export type TableShellVariant = 'fill' | 'card' | 'scroll';

/**
 * Component TableShell
 * @class TableShell
 *
 * @description
 * Shared chrome around an entity table: the bordered, shadow-less
 * `p-card` and its toolbar header, standardized once so every feature table
 * stops re-declaring the same `CardPassThroughOptions`. It is deliberately
 * **not** a `p-table` wrapper — it never receives, renders, or re-exposes any
 * table input, output, or `pTemplate` slot, and it carries no table layout
 * classes of its own. The consumer keeps writing a fully native `<p-table>`
 * (columns, lazy load, selection, skeleton, `emptymessage`, row menus) inside
 * the projected `#table` template; its per-variant styling lives entirely in
 * the `FireguardTheme` preset's `components.datatable.css` extension
 * (`core/primeng/presets/fireguard.preset.ts`), scoped through the host's own
 * `data-variant` attribute (see {@link TableShellVariant}) rather than a
 * `[pt]` factory, because the projected `<p-table>` is always a DOM
 * descendant of this shell.
 *
 * Two content templates are projected through PrimeNG's own `p-card`
 * `pTemplate="header"` / `pTemplate="content"` slots, mirroring the
 * `Card` component:
 *
 * - `#actions` (optional) — the toolbar content (title, search, buttons).
 *   Rendered inside the shared bordered toolbar container. Omit it for a
 *   table with no toolbar.
 * - `#table` (required) — the slot where the native `<p-table>` (and, for
 *   `variant="card"`, an external `<p-paginator>`) is inserted.
 *
 * @example
 * ```html
 * <app-table-shell variant="fill" class="h-full">
 *   <ng-template #actions>
 *     <h2 class="font-semibold">Facilities</h2>
 *     <div class="flex items-center gap-2">
 *       <p-button label="New facility" (onClick)="add.emit()" />
 *     </div>
 *   </ng-template>
 *
 *   <ng-template #table>
 *     <p-table [value]="facilities()" [paginator]="!empty()">
 *       <ng-template pTemplate="header"> … </ng-template>
 *       <ng-template pTemplate="body" let-facility> … </ng-template>
 *     </p-table>
 *   </ng-template>
 * </app-table-shell>
 * ```
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-table-shell',
  templateUrl: './table-shell.component.html',
  imports: [CardModule, NgTemplateOutlet],
  host: {
    '[class]': 'hostClass()',
    '[attr.data-variant]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableShell {
  //#region Inputs
  /**
   * Input variant
   * @readonly
   *
   * @description
   * Layout variant of the card chrome. See {@link TableShellVariant} for the
   * distinction between `fill`, `card`, and `scroll`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TableShellVariant>}
   */
  public readonly variant: InputSignal<TableShellVariant> = input<TableShellVariant>('fill');
  //#endregion

  //#region Content templates
  /**
   * Property actions
   * @readonly
   *
   * @description
   * A template reference for the toolbar content rendered inside the shared
   * header container (title, search field, action buttons). Optional — a
   * table with no toolbar omits it and the header container is not rendered.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly actions: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('actions');

  /**
   * Property table
   * @readonly
   *
   * @description
   * A template reference for the native `<p-table>` this shell wraps. Always
   * required — a `TableShell` with no table has nothing to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly table: Signal<TemplateRef<unknown>> =
    contentChild.required<TemplateRef<unknown>>('table');
  //#endregion

  //#region Properties
  /**
   * Property hostClass
   * @readonly
   *
   * @description
   * Host element classes for the current {@link variant}. `app-table-shell`
   * is a custom element with no default `display`, so without this the host's
   * `class="h-full"` (set by `fill` consumers) has no effect — the card would
   * size to its content while the surrounding layout stays full height,
   * leaving a blank gap below a visibly truncated rounded corner. `fill`
   * makes the host a full-height flex column so the inner `p-card`'s own
   * `h-full` actually resolves against something; `card` and `scroll` keep it
   * a plain block box (a `scroll` table is a card-shaped surface too — only
   * its inner table scrolls horizontally, not the outer shell).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly hostClass: Signal<string> = computed((): string =>
    this.variant() === 'fill' ? 'flex h-full min-h-0 flex-col' : 'block',
  );

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG `p-card` pass-through classes for the current {@link variant}: a
   * bordered, shadow-less surface that either stretches full-height (`fill`)
   * or sits as a self-contained rounded card (`card` and `scroll` share the
   * same card chrome — `scroll` only differs in how its projected `<p-table>`
   * scrolls, not in the outer card shape). Both branches clip their content
   * with `overflow-hidden` on the root — the card alone owns the rounded
   * corners, so the table container and paginator inside it stay flat
   * rectangles instead of each rounding their own corner and fighting the
   * card's clip at the seam.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<CardPassThroughOptions>}
   */
  protected readonly cardPt: Signal<CardPassThroughOptions> = computed(
    (): CardPassThroughOptions =>
      this.variant() === 'fill'
        ? {
            root: {
              class:
                'flex h-full flex-col overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-none dark:border-surface-800 dark:bg-surface-950',
            },
            body: {
              class: 'flex min-h-0 flex-1 flex-col p-0',
            },
          }
        : {
            root: {
              class:
                'flex flex-col overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-none dark:border-surface-800 dark:bg-surface-950',
            },
            body: {
              class: 'p-0',
            },
          },
  );
  //#endregion
}
