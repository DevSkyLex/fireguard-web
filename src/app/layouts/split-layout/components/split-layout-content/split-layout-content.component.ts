import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SPLIT_LAYOUT_CONTENT_MAX_WIDTH } from '../../slots/content';

/**
 * Component SplitLayoutContent
 * @class SplitLayoutContent
 *
 * @description
 * Centered content column of the split layout. Its max-width comes from the
 * route-overridable {@link SPLIT_LAYOUT_CONTENT_MAX_WIDTH} token (default
 * `max-w-3xl`), so a feature route can request a wider column through
 * `provideSplitLayoutSlots({ contentMaxWidth: '…' })` without touching the
 * shared layout.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-split-layout-content>
 *   {{content}}
 * </app-split-layout-content>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-content',
  templateUrl: './split-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutContent {
  //#region Properties
  /**
   * Property maxWidthClass
   * @readonly
   *
   * @description
   * Tailwind max-width utility applied to the content column, resolved from the
   * route-overridable {@link SPLIT_LAYOUT_CONTENT_MAX_WIDTH} token.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly maxWidthClass: string = inject<string>(SPLIT_LAYOUT_CONTENT_MAX_WIDTH);
  //#endregion
}
