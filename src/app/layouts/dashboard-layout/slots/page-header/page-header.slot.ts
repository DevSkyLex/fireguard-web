import { InjectionToken } from '@angular/core';
import type { PageHeaderContribution } from './page-header-contribution.interface';

export const PAGE_HEADER_SLOT: InjectionToken<PageHeaderContribution[]> = new InjectionToken<
  PageHeaderContribution[]
>('PAGE_HEADER_SLOT');
