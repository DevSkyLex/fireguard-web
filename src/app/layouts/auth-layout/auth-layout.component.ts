import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AuthLayoutHeader, AuthLayoutContent, AuthLayoutFooter, AuthLayoutShowcase } from "@layouts/auth-layout/partials";

/**
 * Component AuthLayout
 * @class AuthLayout
 *
 * @description
 * Layout component for authentication pages
 * like login, register, forgot password, etc.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-auth-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-auth-layout',
  imports: [
    RouterOutlet,
    AuthLayoutHeader,
    AuthLayoutContent,
    AuthLayoutFooter,
    AuthLayoutShowcase,
  ],
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
