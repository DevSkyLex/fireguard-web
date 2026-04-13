import type { Routes } from '@angular/router';
import {
  guestGuard,
  mfaGuard,
  passwordResetNewGuard,
  passwordResetVerifyGuard,
} from '@features/auth/http/guards';

/**
 * Constant AUTH_ROUTES
 *
 * @description
 * Routes for the authentication feature module.
 *
 * @since 1.0.0
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./ui/pages/login-page/login-page.component').then((m) => m.LoginPage),
    canActivate: [guestGuard],
    title: 'Sign In',
  },
  {
    path: 'mfa-verify',
    loadComponent: () =>
      import('./ui/pages/mfa-verification-page/mfa-verification-page.component').then(
        (m) => m.MfaVerificationPage,
      ),
    canActivate: [mfaGuard],
    title: 'Verify Identity',
  },
  {
    path: 'mfa',
    redirectTo: 'mfa-verify',
    pathMatch: 'full',
  },
  {
    path: 'password-reset',
    children: [
      {
        path: '',
        redirectTo: 'forgot',
        pathMatch: 'full',
      },
      {
        path: 'forgot',
        loadComponent: () =>
          import('./ui/pages/forgot-password-page/forgot-password-page.component').then(
            (m) => m.ForgotPasswordPage,
          ),
        title: 'Forgot Password',
      },
      {
        path: 'verify',
        loadComponent: () =>
          import('./ui/pages/password-reset-verify-page/password-reset-verify-page.component').then(
            (m) => m.PasswordResetVerifyPage,
          ),
        canActivate: [passwordResetVerifyGuard],
        title: 'Verify Code',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./ui/pages/new-password-page/new-password-page.component').then(
            (m) => m.NewPasswordPage,
          ),
        canActivate: [passwordResetNewGuard],
        title: 'Set New Password',
      },
    ],
  },
];
