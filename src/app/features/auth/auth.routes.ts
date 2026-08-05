import type { Routes } from '@angular/router';
import {
  guestGuard,
  mfaGuard,
  passwordResetNewGuard,
  passwordResetVerifyGuard,
  registerVerifyGuard,
} from './http/guards';

/**
 * Constant AUTH_ROUTES
 *
 * @description
 * The authentication workflow, in the order a visitor walks it: sign in,
 * create an account and confirm it, clear a second factor, or reset a
 * forgotten password in three steps.
 *
 * Every screen is public by definition. `guestGuard` keeps an already-signed-in
 * visitor out of the entry points, while the step guards keep anyone from
 * landing mid-flow without the state that step needs — a challenge to verify, a
 * reset token, a recorded code.
 *
 * @since 1.0.0
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./ui/pages/login-page/login-page.component').then((m) => m.LoginPage),
    title: $localize`:@@route.login:Sign in`,
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./ui/pages/register-page/register-page.component').then((m) => m.RegisterPage),
    title: $localize`:@@route.register:Create account`,
  },
  {
    path: 'register/verify',
    canActivate: [registerVerifyGuard],
    loadComponent: () =>
      import('./ui/pages/register-verify-page/register-verify-page.component').then(
        (m) => m.RegisterVerifyPage,
      ),
    title: $localize`:@@route.registerVerify:Confirm your email`,
  },
  {
    path: 'mfa-verify',
    canActivate: [mfaGuard],
    loadComponent: () =>
      import('./ui/pages/mfa-verify-page/mfa-verify-page.component').then((m) => m.MfaVerifyPage),
    title: $localize`:@@route.mfaVerify:Two-factor verification`,
  },
  {
    path: 'password-reset/forgot',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./ui/pages/forgot-password-page/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPage,
      ),
    title: $localize`:@@route.forgotPassword:Reset your password`,
  },
  {
    path: 'password-reset/verify',
    canActivate: [passwordResetVerifyGuard],
    loadComponent: () =>
      import('./ui/pages/password-reset-verify-page/password-reset-verify-page.component').then(
        (m) => m.PasswordResetVerifyPage,
      ),
    title: $localize`:@@route.passwordResetVerify:Enter your reset code`,
  },
  {
    path: 'password-reset/new',
    canActivate: [passwordResetNewGuard],
    loadComponent: () =>
      import('./ui/pages/new-password-page/new-password-page.component').then(
        (m) => m.NewPasswordPage,
      ),
    title: $localize`:@@route.newPassword:Choose a new password`,
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
