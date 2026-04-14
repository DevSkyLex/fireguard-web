import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component SplitLayoutHeader
 * @class SplitLayoutHeader
 *
 * @description
 * Component for the auth layout header
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout-header/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-header',
  templateUrl: './split-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutHeader {}
