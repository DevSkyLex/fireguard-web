import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * Component AuthLayoutHeader
 * @class AuthLayoutHeader 
 * 
 * @description
 * Component for the auth layout header
 * 
 * @version 1.0.0
 * 
 * @example
 * ```html
 * <app-auth-layout-header/>
 * ```
 * 
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-layout-header',
  templateUrl: './auth-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLayoutHeader {}