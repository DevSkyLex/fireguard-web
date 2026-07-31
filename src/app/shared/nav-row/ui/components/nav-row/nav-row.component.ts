import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Component NavRow
 * @class NavRow
 *
 * @description
 * Dense navigation row for a workspace-style sidebar: a 32px line carrying an
 * icon, a truncating label, and optionally a trailing count. Marks itself
 * active from the router.
 *
 * Domain-agnostic on purpose — every input is a primitive — so both the
 * organization business navigation and the collaboration channel lists can use
 * it without either feature importing the other.
 *
 * Rendered as a real `<a>` with `aria-current`, unlike the source prototype's
 * `<div onClick>`, which had no role, no tabindex and no keyboard handling.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-nav-row icon="pi pi-compass" label="Interventions" [routerLink]="link" [count]="4" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-nav-row',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-row.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavRow {
  //#region Inputs
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class rendered at the row's leading edge.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property label
   * @readonly
   *
   * @description
   * Row label. Truncates rather than wrapping — the column is 266px wide.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property routerLink
   * @readonly
   *
   * @description
   * Navigation target. Drives both the destination and the active state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | readonly unknown[]>}
   */
  public readonly routerLink: InputSignal<string | readonly unknown[]> = input.required<
    string | readonly unknown[]
  >();

  /**
   * Property exact
   * @readonly
   *
   * @description
   * Whether the active state requires an exact URL match. Needed for a parent
   * destination that would otherwise stay lit while a child route is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly exact: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property count
   * @readonly
   *
   * @description
   * Trailing count, such as an unread total. Hidden when `null` or zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly count: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property nested
   * @readonly
   *
   * @description
   * Whether the row sits one level under a parent, which indents it behind a
   * hairline guide and squares off its leading corners.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly nested: InputSignal<boolean> = input<boolean>(false);
  //#endregion
}
