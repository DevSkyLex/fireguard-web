import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component FocusedLayoutContent
 * @class FocusedLayoutContent
 *
 * @description
 * Content partial for centered pages layout.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout-content/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-focused-layout-content',
  templateUrl: './focused-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayoutContent {}

