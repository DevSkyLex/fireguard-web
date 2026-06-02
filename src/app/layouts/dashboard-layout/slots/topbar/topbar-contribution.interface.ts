import type { Type } from '@angular/core';

export interface TopbarContribution {
  readonly id: string;
  readonly order: number;
  readonly component: Type<unknown>;
}
