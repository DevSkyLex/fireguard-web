import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  type ExclusiveSlotContribution,
  resolveExclusiveSlot,
  type SlotContribution,
  SlotOutlet,
} from '@shared/layout-slot';
import { SPLIT_FOOTER_SLOT, SPLIT_HEADER_SLOT, SPLIT_SHOWCASE_SLOT } from './slots';

/**
 * Component SplitLayout
 * @class SplitLayout
 *
 * @description
 * Two-column shell for the entry flows — sign in, register, onboarding: a
 * branded showcase panel on the left and the routed form column on the right.
 *
 * It owns the frame and nothing else. The panel, the floating header and the
 * footer are all slots, so the same shell dresses differently per route
 * through `provideSplitLayoutSlots()`. With nothing contributed the showcase is
 * not rendered and the form column takes the full width.
 *
 * @version 1.0.0
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
  //#region Properties
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
  //#endregion
}
