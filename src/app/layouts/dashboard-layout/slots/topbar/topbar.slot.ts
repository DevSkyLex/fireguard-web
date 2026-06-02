import { InjectionToken } from '@angular/core';
import type { TopbarContribution } from './topbar-contribution.interface';

export const TOPBAR_SLOT: InjectionToken<TopbarContribution[]> =
  new InjectionToken<TopbarContribution[]>('TOPBAR_SLOT');
