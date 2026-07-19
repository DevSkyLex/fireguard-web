import type { Signal, Type } from '@angular/core';

export interface TopbarContribution {
  readonly id: string;
  readonly order: number;
  readonly component: Type<unknown>;

  /**
   * Whether the action applies right now. Registration cannot be conditional —
   * see {@link PanelContribution} for why — so gate here instead. Actions that
   * always apply may omit it.
   *
   * @type {Signal<boolean> | undefined}
   */
  readonly available?: Signal<boolean>;
}
