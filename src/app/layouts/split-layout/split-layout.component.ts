import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  type ExclusiveSlotContribution,
  resolveExclusiveSlot,
  type SlotContribution,
  SlotOutlet,
} from '@shared/layout-slot';
import { hlm } from '@shared/ui/utils';
import { SPLIT_FOOTER_SLOT, SPLIT_HEADER_SLOT, SPLIT_SHOWCASE_SLOT } from './slots';

/**
 * Type SplitWidth
 *
 * @description
 * The content column's cap, keyed by the mounting route's `data.splitWidth`
 * (bound automatically through `withComponentInputBinding()` since
 * `SplitLayout` is itself the routed component). `md` (28rem) is the
 * one-field-at-a-time default shared by sign-in and registration; a route
 * whose form is wider — the onboarding wizard's plan step — opts into more
 * room instead of the layout guessing from its content.
 *
 * @since 1.1.0
 */
type SplitWidth = 'md' | 'xl' | '2xl';

/**
 * The literal Tailwind class per {@link SplitWidth} — Tailwind scans source
 * text, so the map keeps every candidate class spelled out in full rather
 * than assembled from the route value at runtime.
 */
const SPLIT_WIDTH_CLASS: Record<SplitWidth, string> = {
  md: 'max-w-md',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * The form column's floor width per {@link SplitWidth} — the cap plus the
 * column's own `sm:px-8` gutters (4rem), so the panel starts giving way only
 * once the column can hold the whole content box (see the template's own
 * note on the form column).
 */
const SPLIT_COLUMN_MIN_WIDTH_CLASS: Record<SplitWidth, string> = {
  md: 'lg:min-w-[32rem]',
  xl: 'lg:min-w-[40rem]',
  '2xl': 'lg:min-w-[46rem]',
};

/**
 * Component SplitLayout
 * @class SplitLayout
 *
 * @description
 * A shared entry shell with either a full-height presentation column or a compact
 * progress rail. Route data controls the desktop composition, form width and
 * vertical placement; mobile keeps its single scrollable form column.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-split-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout',
  imports: [NgComponentOutlet, RouterOutlet, SlotOutlet],
  templateUrl: './split-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayout {
  //#region Inputs
  /**
   * @description Route-owned desktop composition: a presentation panel for entry pages,
   * or the default compact rail for guided workflows. Missing route data keeps the rail.
   */
  public readonly splitShowcase: InputSignal<'panel' | 'rail'> = input<'panel' | 'rail'>('rail');

  /**
   * Property splitWidth
   * @readonly
   *
   * @description
   * The routed content column's width class, bound from the mounting route's
   * `data.splitWidth` by `withComponentInputBinding()`. Defaults to `'md'`,
   * which auth keeps; onboarding widens it for its own routes.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<SplitWidth>}
   */
  public readonly splitWidth: InputSignal<SplitWidth> = input<SplitWidth>('md');
  /**
   * Property splitAlign
   * @readonly
   *
   * @description
   * Route-owned desktop placement. Growing forms opt into start alignment;
   * an omitted or undefined route value retains centered entry forms.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<'start' | 'center'>}
   */
  public readonly splitAlign: InputSignal<'start' | 'center'> = input<'start' | 'center'>('center');
  //#endregion

  //#region Properties
  /** @description Bounds the desktop presentation so the two columns remain related on wide screens. */
  protected readonly layoutClass: Signal<string> = computed((): string =>
    hlm(
      'mx-auto flex h-dvh w-full overflow-hidden bg-background text-foreground',
      this.splitShowcase() === 'panel' && 'lg:max-w-[1600px]',
    ),
  );

  /** @description Sizes the contributed content according to the mounting route, without knowing its feature. */
  protected readonly showcaseClass: Signal<string> = computed((): string =>
    hlm(
      'hidden min-w-0 shrink-0 overflow-y-auto text-foreground lg:order-first lg:grid',
      this.splitShowcase() === 'panel'
        ? 'border-r border-border bg-muted/50 lg:w-[42%] xl:w-[44%]'
        : 'border-r border-border bg-muted/40 lg:w-64 xl:w-72',
    ),
  );

  /**
   * Property showcaseContributions
   * @readonly
   *
   * @description
   * Every contribution competing for the branded panel.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly ExclusiveSlotContribution[]}
   */
  private readonly showcaseContributions: readonly ExclusiveSlotContribution[] =
    inject<ExclusiveSlotContribution[]>(SPLIT_SHOWCASE_SLOT, { optional: true }) ?? [];

  /**
   * Property showcase
   * @readonly
   *
   * @description
   * The contribution currently claiming the panel, or `null` when none is.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ExclusiveSlotContribution | null>}
   */
  protected readonly showcase: Signal<ExclusiveSlotContribution | null> = computed(
    (): ExclusiveSlotContribution | null => resolveExclusiveSlot(this.showcaseContributions),
  );

  /**
   * Property header
   * @readonly
   *
   * @description
   * Contributions of the chrome floating above the form column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly header: readonly SlotContribution[] =
    inject<SlotContribution[]>(SPLIT_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property footer
   * @readonly
   *
   * @description
   * Contributions of the chrome pinned below the form column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly footer: readonly SlotContribution[] =
    inject<SlotContribution[]>(SPLIT_FOOTER_SLOT, { optional: true }) ?? [];

  /**
   * Property resolvedSplitWidth
   * @readonly
   *
   * @description
   * {@link splitWidth}, defended against `withComponentInputBinding()`'s
   * `alwaysUndefined` behavior: it rebinds every declared input on each
   * navigation, including to `undefined` for a route whose `data` omits the
   * key entirely — clobbering the input's own `'md'` default rather than
   * leaving it untouched. {@link contentClass} and {@link columnClass} read
   * this instead of the raw input so every route keeps the documented
   * default, not only the one that happens to set `data.splitWidth`.
   *
   * @access private
   * @since 1.1.1
   *
   * @type {Signal<SplitWidth>}
   */
  private readonly resolvedSplitWidth: Signal<SplitWidth> = computed(
    (): SplitWidth => this.splitWidth() ?? 'md',
  );

  /**
   * Property contentClass
   * @readonly
   *
   * @description
   * The content box's class list, {@link resolvedSplitWidth} resolved to its
   * literal Tailwind cap through {@link SPLIT_WIDTH_CLASS}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly contentClass: Signal<string> = computed((): string =>
    hlm(
      'mx-auto flex w-full min-w-0 shrink-0 flex-col',
      this.splitAlign() === 'start' ? 'lg:pt-8' : 'sm:my-auto',
      SPLIT_WIDTH_CLASS[this.resolvedSplitWidth()],
    ),
  );

  /**
   * Property columnClass
   * @readonly
   *
   * @description
   * The form column's class list, its {@link resolvedSplitWidth} floor
   * resolved through {@link SPLIT_COLUMN_MIN_WIDTH_CLASS}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly columnClass: Signal<string> = computed((): string =>
    hlm(
      'relative flex min-h-0 min-w-0 flex-1 flex-col',
      SPLIT_COLUMN_MIN_WIDTH_CLASS[this.resolvedSplitWidth()],
    ),
  );
  //#endregion
}
