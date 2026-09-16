import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  Injector,
  output,
  signal,
  viewChild,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { HlmButton } from '@shared/ui/button';
import { HlmCalendarRange } from '@shared/ui/calendar';
import { HlmDateRangePicker } from '@shared/ui/date-picker';
import { HlmDrawer, HlmDrawerImports } from '@shared/ui/drawer';
import { HlmPopoverTrigger } from '@shared/ui/popover';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterPopoverState } from '../../../models';

/**
 * Component CollectionFilterDateRange
 * @class CollectionFilterDateRange
 *
 * @description
 * The date-range twin of `app-collection-filter-select` and the two-bound
 * counterpart of `app-collection-filter-date`: the value segment a `between`
 * filter chip projects into `app-filter-chip`, wrapping `hlm-date-range-picker`
 * (`@shared/ui/date-picker`) behind the same `state` / `stateChanged`
 * contract every other value control in this bar offers. Presentational
 * (`ARCHITECTURE.md` §10.3) — it reports the picked range through
 * {@link valueChanged} and owns no filter state. A distinct component from
 * `app-collection-filter-date` rather than a `mode="single|range"` flag on
 * one: they wrap two distinct brain primitives (`hlm-date-picker` vs.
 * `hlm-date-range-picker`) with two distinct value shapes, exactly the
 * symmetry already kept between `CollectionFilterSelect` and
 * `CollectionFilterMultiSelect`.
 *
 * The seam, the hand-rolled trigger, the `disabled` wiring,
 * the deferred-`open()` fix and the layout caveat are all
 * identical to `app-collection-filter-date` — see its class doc for the full
 * account, in particular why `open()` runs inside `afterNextRender`, why the
 * trigger never binds `HlmDateRangePicker`'s own `disabled` input, and why
 * the unavailability reason is `app-filter-chip`'s to render, not this
 * component's. The one structural
 * difference: {@link value} carries both bounds as a `[Date, Date]` tuple,
 * matching `HlmDateRangePicker`'s own `date` input/`dateChange` output shape
 * (and what a `between` filter's two named bounds already collapse to at
 * every real call site) rather than the `{start, end}` shape a fresher
 * design might reach for.
 *
 * Unlike `app-collection-filter-date`, {@link value} is never bound onto the
 * picker as a template `[date]` expression — see {@link syncPickerValue} for
 * why a declarative binding onto `hlm-date-range-picker` specifically
 * corrupts a two-click range pick. `HlmDateRangePicker.dateChange` only ever
 * fires with a *complete* pair — the picker keeps a half-picked range
 * internal until the second bound lands — so {@link onRangePicked} never
 * sees a partial range to normalize.
 *
 * The trigger chrome itself is repeated mot pour mot from
 * `app-collection-filter-date` as a literal string on each rather than a
 * shared constant — see that component's class doc for why two real
 * consumers is one short of the constant this lot's rule of three would
 * otherwise justify.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-date-range',
  imports: [
    HlmButton,
    HlmCalendarRange,
    HlmDateRangePicker,
    HlmPopoverTrigger,
    ...HlmDrawerImports,
  ],
  templateUrl: './collection-filter-date-range.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterDateRange {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description The two-sided bound currently narrowing the collection, `null` when the field carries none. Both bounds are always set together — see the class doc.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly [Date, Date] | null>}
   */
  public readonly value: InputSignal<readonly [Date, Date] | null> = input.required<
    readonly [Date, Date] | null
  >();

  /**
   * Property placeholder
   * @readonly
   * @description What the trigger reads while no range is set — the field's own label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input.required<string>();

  /**
   * Property accessibleName
   * @readonly
   * @description The trigger's accessible name, carried by a visually hidden label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly accessibleName: InputSignal<string> = input.required<string>();

  /**
   * Property triggerId
   * @readonly
   * @description The trigger button's `id`, targeted by the visually hidden label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input.required<string>();

  /**
   * Property testId
   * @readonly
   * @description The trigger's `data-testid`, the hook specs open this field by.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testId: InputSignal<string> = input.required<string>();

  /**
   * Property state
   * @readonly
   * @description Whether the popover is open, driven by the page so a freshly picked field opens itself. See `app-collection-filter-date`'s class doc for how this reaches `HlmDateRangePicker`'s own popover.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CollectionFilterPopoverState>}
   */
  public readonly state: InputSignal<CollectionFilterPopoverState> =
    input<CollectionFilterPopoverState>('closed');

  /**
   * Property disabled
   * @readonly
   * @description Whether this surface can apply the field at all. Dims the trigger, which stays focusable — see `app-collection-filter-date`'s class doc for why the reason itself is `app-filter-chip`'s to render, not this component's.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property describedBy
   * @readonly
   * @description The `id` of `app-filter-chip`'s own reason row, when the caller's field is unavailable — set directly on the trigger's `aria-describedby`. See `app-collection-filter-date`'s own doc for why this trigger cannot discover that id through Angular DI and must instead receive it explicitly from the owning page. `undefined` adds no caller description; mobile triggers still describe their formatted value.
   * @access public
   * @since 12.1.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly describedBy: InputSignal<string | undefined> = input<string>();
  //#endregion

  //#region Outputs
  /**
   * Property valueChanged
   * @readonly
   * @description The two-sided bound after a pick, `null` once the field carries no narrowing any more.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly [Date, Date] | null>}
   */
  public readonly valueChanged: OutputEmitterRef<readonly [Date, Date] | null> = output<
    readonly [Date, Date] | null
  >();

  /**
   * Property stateChanged
   * @readonly
   * @description The popover opened or closed on its own — the page mirrors it to keep its pending-field memory honest.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CollectionFilterPopoverState>}
   */
  public readonly stateChanged: OutputEmitterRef<CollectionFilterPopoverState> =
    output<CollectionFilterPopoverState>();
  //#endregion

  //#region Properties
  /**
   * Property valueClass
   * @readonly
   * @description The picked range's filled pastille, shared mot pour mot by every value control in this bar.
   * @access protected
   * @since 10.6.0
   * @type {string}
   */
  protected readonly valueClass: string = COLLECTION_FILTER_VALUE_CLASS;

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Uses the mobile interaction mode for touch controls regardless of viewport width.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property mobileValueId
   * @readonly
   * @description Stable id of the mobile trigger's displayed value, including any hidden selections.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly mobileValueId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-mobile-value`,
  );

  /**
   * Property mobileDescribedBy
   * @readonly
   * @description Describes mobile triggers by their displayed value while preserving caller description ids.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly mobileDescribedBy: Signal<string> = computed<string>(() =>
    `${this.mobileValueId()} ${this.describedBy() ?? ''}`.trim(),
  );

  /**
   * Property mobileStart
   * @readonly
   * @description Start bound staged inside the mobile drawer until Apply is activated.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<Date | null>}
   */
  protected readonly mobileStart: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property mobileEnd
   * @readonly
   * @description End bound staged inside the mobile drawer until Apply is activated.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<Date | null>}
   */
  protected readonly mobileEnd: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property mobileRangeComplete
   * @readonly
   * @description Whether the staged mobile range contains both bounds and can be applied.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly mobileRangeComplete: Signal<boolean> = computed<boolean>(
    () => this.mobileStart() !== null && this.mobileEnd() !== null,
  );

  /**
   * Property picker
   * @readonly
   * @description This instance's own `hlm-date-range-picker`, so {@link syncPopoverState} and {@link forwardPopoverState} can reach its public `popover` seam. `undefined` until the view initializes.
   * @access protected
   * @since 1.0.0
   * @type {Signal<HlmDateRangePicker<Date> | undefined>}
   */
  protected readonly picker: Signal<HlmDateRangePicker<Date> | undefined> =
    viewChild<HlmDateRangePicker<Date>>(HlmDateRangePicker);

  /**
   * Property injector
   * @readonly
   * @description This instance's own injector, passed to the `afterNextRender` calls {@link syncPopoverState} schedules — see `app-collection-filter-date`'s class doc for why opening is deferred a render.
   * @access private
   * @since 1.0.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property syncPickerValue
   * @readonly
   *
   * @description
   * Pushes {@link value} into {@link picker} through `writeValue` — the
   * `ControlValueAccessor` method, not a template `[date]` binding.
   * `hlm-date-range-picker`'s own `startDate`/`endDate` are brain-level
   * `model()`s; a declarative `[date]="…"` binding re-asserts on every
   * change-detection pass touching that view, including the ones a day-cell
   * click itself triggers, so it overwrites the calendar's own
   * first-click-sets-start-second-click-sets-end local state before a second
   * click can ever complete a range. `writeValue` only runs when
   * {@link value} itself actually changes, and unlike the picker's own
   * `updateDate()` it does not re-emit `dateChange` — it is meant exactly
   * for "the model changed elsewhere, reflect it" without the loop that
   * would otherwise close.
   *
   * @access private
   * @since 1.0.0
   * @type {EffectRef}
   */
  private readonly syncPickerValue: EffectRef = effect((): void => {
    const value = this.value();
    this.picker()?.writeValue(value ? [value[0], value[1]] : null);
  });

  /**
   * Property drawer
   * @readonly
   * @description Owns explicit closure after the committed range has been emitted.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmDrawer | undefined>}
   */
  private readonly drawer: Signal<HlmDrawer | undefined> = viewChild<HlmDrawer>(HlmDrawer);

  /**
   * Property mobileDrawerVisible
   * @description Tracks actual drawer transitions so one opening owns one draft and one commitment.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private mobileDrawerVisible: boolean = false;

  /**
   * Property syncPopoverState
   * @readonly
   * @description Drives {@link picker}'s popover open or closed from {@link state} directly through `BrnOverlay.open()`/`close()`, opening inside `afterNextRender` — see `app-collection-filter-date`'s class doc for the full account, including why the deferred callback re-reads {@link state} rather than trusting the condition that scheduled it.
   * @access private
   * @since 1.0.1
   * @type {EffectRef}
   */
  private readonly syncPopoverState: EffectRef = effect((): void => {
    const popover = this.picker()?.popover();
    if (!popover) return;

    if (this.isMobileInteractionMode()) {
      popover.close();
      return;
    }

    if (this.state() === 'open') {
      afterNextRender(
        (): void => {
          if (this.state() !== 'open') return;
          popover.open();
        },
        { injector: this.injector },
      );
    } else {
      popover.close();
    }
  });

  /**
   * Property forwardPopoverState
   * @readonly
   * @description Subscribes to {@link picker}'s popover `stateChanged` and re-emits it as this component's own {@link stateChanged}, once per resolved popover.
   * @access private
   * @since 1.0.0
   * @type {EffectRef}
   */
  private readonly forwardPopoverState: EffectRef = effect((onCleanup): void => {
    if (this.isMobileInteractionMode()) return;
    const popover = this.picker()?.popover();
    if (!popover) return;

    const subscription = popover.stateChanged.subscribe((state: BrnOverlayState): void => {
      if (!this.isMobileInteractionMode()) this.stateChanged.emit(state);
    });
    onCleanup((): void => subscription.unsubscribe());
  });
  //#endregion

  //#region Methods
  /**
   * Method onRangePicked
   * @method onRangePicked
   * @description Reacts to `hlm-date-range-picker`'s `dateChange`. A no-op while {@link disabled} is set — the trigger stays clickable, so this is what keeps a pick inert rather than merely invisible.
   * @access protected
   * @since 1.0.0
   * @param {[Date, Date] | null} range - The picker's next, always-complete range.
   * @returns {void}
   */
  protected onRangePicked(range: [Date, Date] | null): void {
    if (this.disabled()) return;
    this.valueChanged.emit(range);
  }

  /**
   * Method onMobileStartChanged
   * @method onMobileStartChanged
   * @description Starts a fresh staged range from the first mobile calendar pick.
   * @access protected
   * @since 1.0.0
   * @param {Date | undefined} start - The selected start date, or undefined when cleared.
   * @returns {void}
   */
  protected onMobileStartChanged(start: Date | undefined): void {
    if (this.disabled() || !this.mobileDrawerVisible) return;
    this.mobileStart.set(start ?? null);
    this.mobileEnd.set(null);
  }

  /**
   * Method onMobileEndChanged
   * @method onMobileEndChanged
   * @description Completes the staged range with the mobile calendar's second pick.
   * @access protected
   * @since 1.0.0
   * @param {Date | undefined} end - The selected end date, or undefined when cleared.
   * @returns {void}
   */
  protected onMobileEndChanged(end: Date | undefined): void {
    if (this.disabled() || !this.mobileDrawerVisible) return;
    this.mobileEnd.set(end ?? null);
  }

  /**
   * Method applyMobileRange
   * @method applyMobileRange
   * @description Commits a complete range once before explicitly closing the drawer.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected applyMobileRange(): void {
    const start = this.mobileStart();
    const end = this.mobileEnd();
    if (!start || !end || this.disabled() || !this.mobileDrawerVisible) return;
    this.mobileDrawerVisible = false;
    this.picker()?.updateDate([start, end]);
    this.drawer()?.close();
  }

  /**
   * Method onMobileStateChanged
   * @method onMobileStateChanged
   * @description Seeds the draft once on each actual opening, including controlled openings, and forwards dismissal.
   * @access protected
   * @since 1.0.0
   * @param {CollectionFilterPopoverState} state - The drawer's next state.
   * @returns {void}
   */
  protected onMobileStateChanged(state: CollectionFilterPopoverState): void {
    if (state === 'open' && !this.mobileDrawerVisible) {
      const value = this.value();
      this.mobileStart.set(value?.[0] ?? null);
      this.mobileEnd.set(value?.[1] ?? null);
    }
    this.mobileDrawerVisible = state === 'open';
    this.stateChanged.emit(state);
  }
  //#endregion
}
