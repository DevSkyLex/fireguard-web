import { InjectionToken } from '@angular/core';
import type { AsideContribution } from './aside-contribution.interface';

export const ASIDE_SLOT: InjectionToken<AsideContribution[]> =
  new InjectionToken<AsideContribution[]>('ASIDE_SLOT');
