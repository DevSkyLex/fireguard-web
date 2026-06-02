import { InjectionToken } from '@angular/core';
import type { NavigationContribution } from './navigation-contribution.interface';

export const NAVIGATION_SLOT: InjectionToken<NavigationContribution[]> =
  new InjectionToken<NavigationContribution[]>('NAVIGATION_SLOT');
