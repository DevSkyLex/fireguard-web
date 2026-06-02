import type { Signal, Type } from '@angular/core';

export interface AsideContribution {
  readonly id: string;
  readonly priority: number;
  readonly component: Type<unknown>;
  readonly active: Signal<boolean>;
}
