import { InjectionToken } from '@angular/core';
import type { ShellPanelPort } from './shell-panel.interface';

/**
 * Constant SHELL_PANEL_PORT
 * @const SHELL_PANEL_PORT
 *
 * @description
 * Provides the shell contextual-panel contract.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<ShellPanelPort>}
 */
export const SHELL_PANEL_PORT: InjectionToken<ShellPanelPort> = new InjectionToken<ShellPanelPort>(
  'SHELL_PANEL_PORT',
);
