import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucideTrendingDown, lucideTrendingUp } from '@ng-icons/lucide';
import { HlmCardImports } from '@shared/ui/card';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { StatTileDelta, StatTileLink, StatTileTone } from './models';

/**
 * Component StatTile
 * @class StatTile
 *
 * @description
 * A compact KPI card: a label, a headline value, and an optional trend —
 * built on the `hlmCard` primitives rather than bespoke markup so it stays on
 * theme for free. Reused across the organization's data-dense surfaces
 * (statistics, Today, billing overview), which keeps it feature-owned
 * (`ARCHITECTURE.md` §2.8) rather than promoted to `shared/` on speculation.
 *
 * The interface is achromatic by decision (`PRODUCT.md`): a trend's
 * desirability is never carried by colour. The arrow always shows the literal
 * direction; whether that direction is good news is instead carried by text
 * weight — `text-foreground font-medium` for a desirable move, muted for an
 * undesirable one — paired with a signed number and a screen-reader-only word,
 * never colour alone.
 *
 * Rendered as an anchor when {@link link} is set and a plain card otherwise,
 * sharing one content template so the two branches cannot drift.
 *
 * {@link tone} carries the same achromatic discipline for a metric that is
 * simply in a bad state rather than trending one way or another (an overdue
 * count, say): it colours the icon alone, per the Glyph Rule (`DESIGN.md`).
 *
 * @version 1.2.0
 *
 * @example
 * ```html
 * <app-stat-tile
 *   label="Open non-conformities"
 *   [value]="12"
 *   [delta]="{ value: 8, direction: 'up', positiveIsGood: false }"
 *   icon="lucideTriangleAlert"
 *   [link]="['/organizations', organizationId, 'inspections']"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-stat-tile',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    RouterLink,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmProgressImports,
  ],
  providers: [provideIcons({ lucideMinus, lucideTrendingDown, lucideTrendingUp })],
  templateUrl: './stat-tile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatTile {
  //#region Inputs
  /**
   * Property value
   * @readonly
   *
   * @description
   * The headline figure, already formatted by the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | number>}
   */
  public readonly value: InputSignal<string | number> = input.required<string | number>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * What the value counts, already localized by the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional muted line under the value — a hint such as the comparison
   * period.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly description: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Optional registered lucide icon name for the metric itself, decorative.
   * The caller registers it with `provideIcons()`, matching `EmptyState`'s
   * convention so this tile pulls in no icon set of its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property delta
   * @readonly
   *
   * @description
   * Optional change to report alongside the value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StatTileDelta | null>}
   */
  public readonly delta: InputSignal<StatTileDelta | null> = input<StatTileDelta | null>(null);

  /**
   * Property link
   * @readonly
   *
   * @description
   * Optional `routerLink` destination. When set, the tile renders as a
   * hoverable, focusable anchor instead of an inert card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StatTileLink | null>}
   */
  public readonly link: InputSignal<StatTileLink | null> = input<StatTileLink | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the value is still resolving. Renders a skeleton that mirrors the
   * resolved layout so the tile does not reflow when data arrives.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property progress
   * @readonly
   *
   * @description
   * Optional 0–100 completion percentage, rendered as a compact meter below
   * the value — for a metric better read as "how full" than as a trend
   * (a quota seat count, for instance). Mutually orthogonal to {@link delta}:
   * a tile shows one or the other, never both.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly progress: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property tone
   * @readonly
   *
   * @description
   * The tile's severity, `neutral` by default. Maps **only** to the icon's
   * colour — the Glyph Rule (`DESIGN.md`) — the surface, border, value and
   * label stay on their neutral tokens regardless of tone.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<StatTileTone>}
   */
  public readonly tone: InputSignal<StatTileTone> = input<StatTileTone>('neutral');
  //#endregion

  //#region Properties
  /**
   * Property deltaIcon
   * @readonly
   *
   * @description
   * The arrow matching the delta's literal direction — never the sentiment.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deltaIcon: Signal<string> = computed<string>(() => {
    const direction = this.delta()?.direction;

    if (direction === 'up') return 'lucideTrendingUp';
    if (direction === 'down') return 'lucideTrendingDown';

    return 'lucideMinus';
  });

  /**
   * Property deltaGood
   * @readonly
   *
   * @description
   * Whether the delta's direction is the desirable one for this metric,
   * `null` when flat — a flat trend is neither good nor bad. Drives the
   * achromatic weight distinction (`ARCHITECTURE.md` / `PRODUCT.md`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean | null>}
   */
  protected readonly deltaGood: Signal<boolean | null> = computed<boolean | null>(() => {
    const delta = this.delta();

    if (!delta || delta.direction === 'flat') return null;

    return (delta.direction === 'up') === delta.positiveIsGood;
  });

  /**
   * Property deltaText
   * @readonly
   *
   * @description
   * The signed magnitude shown beside the arrow.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deltaText: Signal<string> = computed<string>(() => {
    const delta = this.delta();

    if (!delta) return '';
    if (delta.direction === 'up') return `+${delta.value}`;
    if (delta.direction === 'down') return `−${delta.value}`;

    return `${delta.value}`;
  });
  //#endregion
}
