import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmEmptyImports } from '@shared/ui/empty';

/**
 * Component EmptyState
 * @class EmptyState
 *
 * @description
 * The nothing-here surface: a glyph, a heading, a sentence, and whatever the
 * caller projects as the way out. A thin composition of spartan's vendored
 * `empty` primitive (`@shared/ui/empty`) — do not fork it back to bespoke
 * markup. Generic by design — it names no domain and takes only scalars
 * (`ARCHITECTURE.md` §6.4).
 *
 * The icon is a name, not a component: the caller registers it with
 * `provideIcons()` so this concept pulls in no icon set of its own.
 *
 * `host: { class: 'block' }` because every caller styles this tag directly
 * (`class="rounded-md border border-dashed ..."`) expecting a real box —
 * without it the host falls back to the browser's default `display: inline`
 * for an unrecognized element, and its border/padding render around whatever
 * the inline layout algorithm decides rather than around the visible content,
 * which only becomes obvious once this sits inside a narrower flex ancestor
 * (a tab panel, in particular) instead of a full-width block column.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-empty-state icon="lucideCircleCheck" title="Nothing is blocking">
 *   <button hlmBtn>Plan work</button>
 * </app-empty-state>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-empty-state',
  imports: [NgIcon, ...HlmEmptyImports],
  host: { class: 'block' },
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  //#region Inputs
  /**
   * Property title
   * @readonly
   *
   * @description
   * The heading naming what is absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional sentence explaining the state.
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
   * Optional registered icon name, rendered decoratively above the heading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> = input<string | null>(null);
  //#endregion
}
