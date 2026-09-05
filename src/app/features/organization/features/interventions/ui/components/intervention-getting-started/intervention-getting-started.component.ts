import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircle, lucideCircleCheck } from '@ng-icons/lucide';
import type {
  InterventionReadinessItem,
  InterventionReadinessTarget,
} from '@features/organization/features/interventions/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmItemImports } from '@shared/ui/item';

/**
 * Component InterventionGettingStarted
 * @class InterventionGettingStarted
 *
 * @description
 * What still stands between a draft and its first plan — every prerequisite
 * listed at once, each a direct way to the in-place editor that satisfies it.
 *
 * This is the whole of what replaces the old four-step planning wizard, and it
 * is deliberately not a progress-bar-plus-next-item strip: a planner filling
 * in a draft benefits from seeing the whole short list up front (site,
 * responsible, due date, scope) rather than one item revealed at a time. It
 * stays a table of contents over the in-place editors, never a second place to
 * edit, so it can guide without duplicating a single field.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-getting-started
 *   [items]="readinessItems()"
 *   (itemActivated)="openEditor($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-getting-started',
  imports: [NgIcon, HlmBadge, ...HlmItemImports],
  providers: [provideIcons({ lucideCircle, lucideCircleCheck })],
  templateUrl: './intervention-getting-started.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionGettingStarted {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * The prerequisites for planning, already localized and ordered by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionReadinessItem[]>}
   */
  public readonly items: InputSignal<readonly InterventionReadinessItem[]> =
    input.required<readonly InterventionReadinessItem[]>();
  //#endregion

  //#region Outputs
  /**
   * Property itemActivated
   * @readonly
   *
   * @description
   * The user asked to close a gap, so the page opens the matching editor where
   * that property lives.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionReadinessTarget>}
   */
  public readonly itemActivated: OutputEmitterRef<InterventionReadinessTarget> =
    output<InterventionReadinessTarget>();
  //#endregion

  //#region Properties
  /**
   * Property nextItemId
   * @readonly
   *
   * @description
   * The first unsatisfied prerequisite's id, so exactly one row carries
   * `aria-current="step"` — every other row stays a plain, completable item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly nextItemId: Signal<string | null> = computed<string | null>(
    () => this.items().find((item) => !item.done)?.id ?? null,
  );
  //#endregion
}
