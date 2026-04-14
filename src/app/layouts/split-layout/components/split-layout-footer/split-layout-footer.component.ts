import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DividerModule } from 'primeng/divider';

/**
 * Component SplitLayoutFooter
 * @class SplitLayoutFooter
 *
 * @description
 * Component for the auth layout footer
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout-footer/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-footer',
  imports: [DividerModule],
  templateUrl: './split-layout-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutFooter {}
