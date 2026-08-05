export { AUTH_SESSION_PORT, AUTH_LOGOUT_PORT } from './ports';
export type { AuthSessionPort, AuthLogoutPort } from './ports';
export { provideAuthFeature } from './auth.feature';
export { authInterceptor, unauthorizedInterceptor } from './http/interceptors';
export {
  authGuard,
  guestGuard,
  mfaGuard,
  passwordResetNewGuard,
  passwordResetVerifyGuard,
} from './http/guards';
export { authStoreEvents } from './state';
// Published because account owns its own change-password form but not the policy:
// auth is the single authority mirroring the API's password constraints.
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from './constants';
