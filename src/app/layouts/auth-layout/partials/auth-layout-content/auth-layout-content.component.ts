import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * Component AuthLayoutContent
 * @class AuthLayoutContent 
 * 
 * @description
 * Component for the auth layout content
 * 
 * @version 1.0.0
 * 
 * @example
 * ```html
 * <app-auth-layout-content>
 *   {{content}}
 * </app-auth-layout-content>
 * ```
 * 
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-layout-content',
  templateUrl: './auth-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLayoutContent {}