import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component SplitLayoutContent
 * @class SplitLayoutContent
 *
 * @description
 * Component for the auth layout content
 *
 * @version 1.0.0
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
export class SplitLayoutContent {}
