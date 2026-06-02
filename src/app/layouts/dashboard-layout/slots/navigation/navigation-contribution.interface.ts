import type { Signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';

export interface NavigationContribution {
  readonly id: string;
  readonly order: number;
  readonly includeInPrimary?: boolean;
  readonly section: Signal<MenuItem | null>;
}
