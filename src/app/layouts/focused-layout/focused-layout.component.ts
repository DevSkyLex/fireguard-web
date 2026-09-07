import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { type SlotContribution, SlotOutlet } from '@shared/layout-slot';
import { FOCUSED_FOOTER_SLOT, FOCUSED_HEADER_SLOT } from './slots';

/**
 * Component FocusedLayout
 * @class FocusedLayout
 *
 * @description
 * Minimal shell for standalone pages — errors, maintenance, anything a member
 * lands on without the workspace around it. One horizontally and vertically centred content row
 * between an optional header and footer, both of them slots.
 * A non-interactive dotted backdrop fades along the shell edges in both themes,
 * leaving the central reading area clear for every focused page.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * Three rows, the middle one taking the slack. The shell itself never scrolls:
 * the content row owns the scroller, so the header and footer stay put on a
 * page taller than the viewport. Auto block margins centre short content and
 * collapse for tall content, keeping its beginning reachable by scrolling.
 */
@Component({
  selector: 'app-focused-layout',
  imports: [RouterOutlet, SlotOutlet],
  templateUrl: './focused-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayout {
  //#region Properties
  /**
   * Property header
   * @readonly
   *
   * @description
   * Contributions of the top chrome.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly header: readonly SlotContribution[] =
    inject<SlotContribution[]>(FOCUSED_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property footer
   * @readonly
   *
   * @description
   * Contributions of the bottom chrome.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly footer: readonly SlotContribution[] =
    inject<SlotContribution[]>(FOCUSED_FOOTER_SLOT, { optional: true }) ?? [];
  //#endregion
}
