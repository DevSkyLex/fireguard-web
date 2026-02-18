import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component FocusedLayoutFooter
 * @class FocusedLayoutFooter
 *
 * @description
 * Footer partial for centered pages layout.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout-footer/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-focused-layout-footer',
  templateUrl: './focused-layout-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayoutFooter {}

