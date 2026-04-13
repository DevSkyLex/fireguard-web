import { InjectionToken } from '@angular/core';
import type { ThemePort } from './theme.interface';

/**
 * Constant THEME_PORT
 * @const THEME_PORT
 *
 * @description
 * Injection token for the core-owned theme contract.
 * Bound by core theme providers.
 *
 * @type {InjectionToken<ThemePort>}
 */
export const THEME_PORT: InjectionToken<ThemePort> = new InjectionToken<ThemePort>('THEME_PORT');
