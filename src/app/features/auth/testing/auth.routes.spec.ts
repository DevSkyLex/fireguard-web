import type { Route } from '@angular/router';
import { AUTH_ROUTES } from '../auth.routes';
import {
  guestGuard,
  mfaGuard,
  passwordResetNewGuard,
  passwordResetVerifyGuard,
  registerVerifyGuard,
} from '../http/guards';
import { EmailChangeConfirmPage } from '../ui/pages/email-change-confirm-page/email-change-confirm-page.component';
import { FederatedCallbackPage } from '../ui/pages/federated-callback-page/federated-callback-page.component';
import { ForgotPasswordPage } from '../ui/pages/forgot-password-page/forgot-password-page.component';
import { LoginPage } from '../ui/pages/login-page/login-page.component';
import { MfaVerifyPage } from '../ui/pages/mfa-verify-page/mfa-verify-page.component';
import { NewPasswordPage } from '../ui/pages/new-password-page/new-password-page.component';
import { PasswordResetVerifyPage } from '../ui/pages/password-reset-verify-page/password-reset-verify-page.component';
import { RegisterPage } from '../ui/pages/register-page/register-page.component';
import { RegisterVerifyPage } from '../ui/pages/register-verify-page/register-verify-page.component';

const routeAt = (path: string): Route => {
  const route = AUTH_ROUTES.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Missing authentication route: ${path}`);
  return route;
};

const expectPage = async (route: Route, componentType: unknown): Promise<void> => {
  const component = await route.loadComponent?.();
  expect(component).toBe(componentType);
};

describe('AUTH_ROUTES', () => {
  it('keeps entry points for anonymous visitors behind the guest guard', async () => {
    const entries = [
      ['login', LoginPage],
      ['register', RegisterPage],
      ['password-reset/forgot', ForgotPasswordPage],
    ] as const;

    await Promise.all(
      entries.map(async ([path, page]) => {
        const route = routeAt(path);
        expect(route.canActivate).toEqual([guestGuard]);
        await expectPage(route, page);
      }),
    );
  });

  it('applies the guard for each verification or reset step', async () => {
    const steps = [
      ['register/verify', registerVerifyGuard, RegisterVerifyPage],
      ['mfa-verify', mfaGuard, MfaVerifyPage],
      ['password-reset/verify', passwordResetVerifyGuard, PasswordResetVerifyPage],
      ['password-reset/new', passwordResetNewGuard, NewPasswordPage],
    ] as const;

    await Promise.all(
      steps.map(async ([path, guard, page]) => {
        const route = routeAt(path);
        expect(route.canActivate).toEqual([guard]);
        await expectPage(route, page);
      }),
    );
  });

  it('allows public callback links and email confirmation to reach their pages', async () => {
    const callback = routeAt('federated/:provider/callback');
    const emailConfirmation = routeAt('email-change/confirm');

    expect(callback.canActivate).toBeUndefined();
    expect(emailConfirmation.canActivate).toBeUndefined();
    await expectPage(callback, FederatedCallbackPage);
    await expectPage(emailConfirmation, EmailChangeConfirmPage);
  });

  it('opens sign-in for a bare auth URL', () => {
    expect(routeAt('')).toMatchObject({ pathMatch: 'full', redirectTo: 'login' });
  });
});
