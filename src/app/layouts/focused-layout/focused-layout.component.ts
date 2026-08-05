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
 * lands on without the workspace around it. One vertically centred content row
 * between an optional header and footer, both of them slots.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
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
