import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucideTrendingDown, lucideTrendingUp } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmCardImports } from '@shared/ui/card';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { StatTileBadge, StatTileDelta, StatTileLink, StatTileTone } from './models';

/**
 * Component StatTile
 * @class StatTile
 *
 * @description
 * Organization-owned KPI using native Card anatomy, a wrapping label/qualifier row and
 * a consistent 24px figure; a badge takes precedence over a delta, then the decorative icon.
 * The interaction-capabilities port selects small mobile Cards or default desktop density without replacing
 * their content, while optional links, captions and progress retain the same semantic structure.
 * The figure is a styled child so the small Card's native heading scale does not shrink metrics.
 *
 * @version 2.0.0
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
    ...HlmBadgeImports,
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
   * What the value counts, already localized by the caller. Wraps in full within
   * the available width, including long translations in small mobile cards.
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
   * period, or the footer's context line when {@link caption} is set.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly description: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property caption
   * @readonly
   *
   * @description
   * Optional footer headline — moves the tile into the differentiated
   * `hlmCardFooter` zone, {@link description} riding along beneath it as
   * the muted context line. The value retains the same size with or without a
   * caption; `null` keeps the tile in its plain, compact rendering.
   *
   * @access public
   * @since 1.4.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly caption: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Optional registered lucide icon name for the metric itself, decorative.
   * The caller registers it with `provideIcons()`, matching the Spartan `Empty` composition's
   * convention so this tile pulls in no icon set of its own. Rendered in
   * the header action slot only, and only as the fallback once {@link badge}
   * and {@link delta} are both unset — the footer headline next to
   * {@link caption} carries no icon, since the caption's text already
   * states what the icon would have doubled.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property badge
   * @readonly
   *
   * @description
   * Optional honest qualifier pill for the header action slot, taking
   * {@link icon}'s and {@link delta}'s place there when set — see the class
   * description for the full corner priority. `null` on every tile in every
   * consumer but the ones that opt in.
   *
   * @access public
   * @since 1.4.0
   *
   * @type {InputSignal<StatTileBadge | null>}
   */
  public readonly badge: InputSignal<StatTileBadge | null> = input<StatTileBadge | null>(null);

  /**
   * Property delta
   * @readonly
   *
   * @description
   * Optional change to report alongside the value, rendered as an outline
   * pill in the header action slot — see the class description for the full
   * corner priority against {@link badge} and {@link icon}.
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
   * Property queryParams
   * @readonly
   *
   * @description
   * Optional query params appended to {@link link} — a filtered destination
   * (a status or a due-date window, say) rather than the collection's plain
   * root. Ignored when {@link link} is unset.
   *
   * @access public
   * @since 1.3.0
   *
   * @type {InputSignal<Readonly<Record<string, string>> | null>}
   */
  public readonly queryParams: InputSignal<Readonly<Record<string, string>> | null> =
    input<Readonly<Record<string, string>> | null>(null);

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
   * Property isMobileInteractionMode
   * @readonly
   * @description Selects native small Card spacing from the central interaction mode.
   * @access protected
   * @since 2.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

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
   * `null` when flat — a flat trend is neither good nor bad. Drives
   * {@link deltaTone}.
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
   * Property deltaTone
   * @readonly
   *
   * @description
   * {@link deltaGood} translated to the tone that colours {@link deltaIcon}
   * alone, per the Glyph Rule (`DESIGN.md`) — `success` for a desirable
   * move, `destructive` for an undesirable one, `neutral` for a flat delta.
   *
   * @access protected
   * @since 1.8.0
   *
   * @type {Signal<StatTileTone>}
   */
  protected readonly deltaTone: Signal<StatTileTone> = computed<StatTileTone>(() => {
    const good = this.deltaGood();

    if (good === null) return 'neutral';

    return good ? 'success' : 'destructive';
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
