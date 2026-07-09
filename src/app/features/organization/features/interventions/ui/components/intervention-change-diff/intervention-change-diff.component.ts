import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { ChangePatchEntry } from './models';
import { formatChangePatch } from './utils';

/**
 * Component InterventionChangeDiff
 * @class InterventionChangeDiff
 *
 * @description
 * Presentational, read-only renderer for a proposed-change patch. It replaces the
 * raw JSON dump previously shown in the review panel with a legible field → value
 * list: each patched field is humanized and its proposed value is set in the
 * monospace data face so a reviewer can read exactly what publication will apply.
 * It owns no state and emits no events.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-change-diff [patch]="change.patch" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-change-diff',
  templateUrl: './intervention-change-diff.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionChangeDiff {
  //#region Inputs
  /**
   * Property patch
   * @readonly
   *
   * @description
   * Raw proposed-change patch map straight from the API.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, unknown>>>}
   */
  public readonly patch: InputSignal<Readonly<Record<string, unknown>>> =
    input.required<Readonly<Record<string, unknown>>>();
  //#endregion

  //#region Properties
  /**
   * Property entries
   * @readonly
   *
   * @description
   * Humanized field → value rows derived from {@link patch}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ChangePatchEntry[]>}
   */
  protected readonly entries: Signal<readonly ChangePatchEntry[]> = computed<
    readonly ChangePatchEntry[]
  >(() => formatChangePatch(this.patch()));
  //#endregion
}
