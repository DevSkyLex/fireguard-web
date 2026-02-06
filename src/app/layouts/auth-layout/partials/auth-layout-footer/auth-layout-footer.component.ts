import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DividerModule } from 'primeng/divider';

/**
 * Component AuthLayoutFooter
 * @class AuthLayoutFooter 
 * 
 * @description
 * Component for the auth layout footer
 * 
 * @version 1.0.0
 * 
 * @example
 * ```html
 * <app-auth-layout-footer/>
 * ```
 * 
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-layout-footer',
  imports: [DividerModule],
  templateUrl: './auth-layout-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLayoutFooter {}