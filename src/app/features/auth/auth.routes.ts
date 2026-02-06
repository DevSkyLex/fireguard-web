import type { Routes } from '@angular/router';
import { mfaGuard } from '@core/guards';

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
    loadComponent: () => import('./pages/login-page/login-page.component').then((m) => m.LoginPage),
    title: 'Sign In',
  },
  {
    path: 'mfa-verify',
    loadComponent: () => import('./pages/mfa-verification-page/mfa-verification-page.component').then((m) => m.MfaVerificationPage),
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
        loadComponent: () => import('./pages/forgot-password-page/forgot-password-page.component').then((m) => m.ForgotPasswordPage),
        title: 'Forgot Password',
      },
      {
        path: 'verify',
        loadComponent: () => import('./pages/password-reset-verify-page/password-reset-verify-page.component').then((m) => m.PasswordResetVerifyPage),
        title: 'Verify Code',
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/new-password-page/new-password-page.component').then((m) => m.NewPasswordPage),
        title: 'Set New Password',
      },
    ],
  },
];
