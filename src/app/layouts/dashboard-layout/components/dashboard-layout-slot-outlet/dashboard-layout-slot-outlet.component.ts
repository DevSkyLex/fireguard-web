import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  type InputSignal,
  type Signal,
  type Type,
  type WritableSignal,
} from '@angular/core';
import type { SlotComponentSource } from '@layouts/dashboard-layout/slots/slot-component-source';

/**
 * Component DashboardLayoutSlotOutlet
 * @class DashboardLayoutSlotOutlet
 *
 * @description
 * Renders one slot contribution, resolving its component from either form of
 * {@link SlotComponentSource}: an eager `component` renders immediately, a
 * `loadComponent` thunk is imported the first time this outlet is created and
 * rendered once it resolves.
 *
 * That import is deliberately *not* a `@defer` block: `@defer` needs a
 * statically analysable component reference in its template, which is exactly
 * the static edge we are trying not to create. A signal filled in by the
 * dynamic import keeps the contribution's component out of the eager graph
 * while `NgComponentOutlet` still receives a plain class.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-slot-outlet [source]="contribution" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-slot-outlet',
  imports: [NgComponentOutlet],
  template: `
    @if (resolved(); as component) {
      <ng-container *ngComponentOutlet="component" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSlotOutlet {
  //#region Inputs
  /**
   * Property source
   * @readonly
   *
   * @description
   * The contribution to render — anything carrying a `component` or a
   * `loadComponent`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<SlotComponentSource>}
   */
  public readonly source: InputSignal<SlotComponentSource> = input.required<SlotComponentSource>();
  //#endregion

  //#region Properties
  /**
   * Property loaded
   *
   * @description
   * Component classes already resolved from a `loadComponent` thunk, keyed by
   * that thunk. A map rather than a single slot because one outlet instance is
   * reused when the `@for` block re-renders with a different contribution.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<ReadonlyMap<() => Promise<Type<unknown>>, Type<unknown>>>}
   */
  private readonly loaded: WritableSignal<
    ReadonlyMap<() => Promise<Type<unknown>>, Type<unknown>>
  > = signal<ReadonlyMap<() => Promise<Type<unknown>>, Type<unknown>>>(new Map());

  /**
   * Property resolved
   * @readonly
   *
   * @description
   * The class to render, or `null` while a deferred component is still in
   * flight (or when the contribution declares neither form).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Type<unknown> | null>}
   */
  protected readonly resolved: Signal<Type<unknown> | null> = computed((): Type<unknown> | null => {
    const source: SlotComponentSource = this.source();

    if (source.component) return source.component;
    if (!source.loadComponent) return null;

    return this.loaded().get(source.loadComponent) ?? null;
  });
  //#endregion

  //#region Constructor
  /**
   * Creates the outlet and starts the deferred import when the contribution
   * only carries a loader.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const source: SlotComponentSource = this.source();
      const loadComponent: (() => Promise<Type<unknown>>) | undefined = source.loadComponent;

      if (source.component || !loadComponent) return;
      if (this.loaded().has(loadComponent)) return;

      void loadComponent().then((component: Type<unknown>): void => {
        this.loaded.update(
          (
            current: ReadonlyMap<() => Promise<Type<unknown>>, Type<unknown>>,
          ): ReadonlyMap<() => Promise<Type<unknown>>, Type<unknown>> =>
            new Map(current).set(loadComponent, component),
        );
      });
    });
  }
  //#endregion
}
