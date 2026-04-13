import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component FocusedLayoutHeader
 * @class FocusedLayoutHeader
 *
 * @description
 * Header partial for centered pages layout.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout-header/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-focused-layout-header',
  templateUrl: './focused-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayoutHeader {}
