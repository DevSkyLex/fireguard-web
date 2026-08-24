import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  Injector,
  output,
  viewChild,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { HlmButton } from '@shared/ui/button';
import { HlmDatePicker } from '@shared/ui/date-picker';
import { HlmPopoverTrigger } from '@shared/ui/popover';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterPopoverState } from '../../../models';

/**
 * Component CollectionFilterDate
 * @class CollectionFilterDate
 *
 * @description
 * The date twin of `app-collection-filter-select`: the value segment a
 * `greaterThan` / `lessThan` filter chip projects into `app-filter-chip`,
 * wrapping `hlm-date-picker` (`@shared/ui/date-picker`) behind the same
 * `state` / `stateChanged` contract every other value control in this bar
 * offers. Presentational (`ARCHITECTURE.md` §10.3) — it reports the picked
 * date through {@link valueChanged} and owns no filter state.
 *
 * `hlm-date-picker` publishes no `state` input or `stateChanged` output of
 * its own — its internal popover is driven by a `protected _popoverState`
 * signal with no public seam. The seam that does exist is
 * `HlmDatePicker.popover` (`public readonly popover = viewChild.required(BrnPopover)`):
 * the very `BrnOverlay` its internal `<hlm-popover>` drives, exposing the
 * ordinary `open()`, `close()` and `stateChanged` (`BrnOverlay`'s own
 * `output()`) any caller can use directly. {@link syncPopoverState} calls
 * `open()`/`close()` from {@link state} once {@link picker} resolves;
 * {@link forwardPopoverState} subscribes to that same `stateChanged` and
 * re-emits it as this component's own {@link stateChanged}. Neither tries to
 * rebind an input `HlmDatePicker` already owns — both drive the shared
 * `BrnOverlay` instance directly.
 *
 * `open()` is called from inside `afterNextRender` rather than straight from
 * the effect: `BrnOverlay` wires the CDK-level Escape/outside-click
 * dismissal listeners (`_connectDismissalEvents`) synchronously inside its
 * own `open()` call, and a call landing before that render settles leaves
 * the overlay visible but never registered with those listeners — reproduced
 * directly: without this deferral the popover opens but never closes on
 * Escape, `testing/collection-filter-date.component.spec.ts` covers it.
 * `BrnOverlay`'s own internal state-input effect avoids
 * this by being declared inside `afterNextRender` itself; driving `open()`
 * imperatively from outside has to reproduce that same deferral by hand.
 * `close()` needs no such deferral — it only ever tears down an overlay
 * `open()` already fully registered.
 *
 * The trigger is hand-rolled rather than `hlm-date-picker-trigger`: that
 * component's inner `<button [disabled]="_disabled()">` reads
 * `HlmDatePicker`'s own `disabled` input through the native attribute, with
 * no seam to swap in `aria-disabled` the way `HlmComboboxTrigger` added for
 * `app-collection-filter-select` — and native `disabled` would drop the
 * trigger out of the tab order, the exact defect that fix avoids. This
 * component never binds `HlmDatePicker`'s `disabled` input at all, so that
 * coupling never engages; {@link onDatePicked} refuses to emit while
 * {@link disabled} is set instead, so the popover still opens (a disabled
 * field still explains itself) while a pick becomes a no-op.
 *
 * {@link tooltip} renders nothing here, visually or through
 * `aria-describedby` — homogeneous with `app-collection-filter-select` and
 * `app-collection-filter-multi-select`: a 192px-capped trigger has no room
 * for a full sentence next to its value pastille at a 375px viewport. The
 * reason renders as `app-filter-chip`'s own trailing row instead, at the
 * chip's own width — see its class doc. {@link describedBy} is the separate,
 * still-live channel that actually connects this trigger to that row: see
 * its own doc for why an explicit id, handed down by the owning page, is
 * what a DI-only fix cannot reach here.
 *
 * `HlmDatePicker`'s own host is `block` and its internal `<hlm-popover>`
 * carries no height class — unlike `hlm-combobox`, which has neither
 * wrapper, so the `h-full`/`self-stretch` chain
 * `app-collection-filter-select` relies on has no auto-height ancestor to
 * cross. The trigger still carries `flex h-full self-stretch` for whichever
 * context does stretch it, backed by `min-h-7`/`max-sm:min-h-11` so it
 * matches `app-filter-chip`'s own row height even where that chain does not
 * reach all the way through — unproven in a browser, see the handoff report.
 * `app-collection-filter-date-range` repeats this trigger chrome mot pour
 * mot, kept as a literal string on each rather than a shared constant: it is
 * only two real consumers, one short of the third that would justify lifting
 * it (`CLAUDE.md` rule 8), and it is a distinct string from
 * `app-collection-filter-select`'s own trigger chrome — no `ng-icon`, no
 * host/button `class` merge to cancel, an explicit `focus-visible` ring
 * instead — so it could not fold into one shared constant with that pair
 * even once a third consumer existed.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-date',
  imports: [HlmButton, HlmDatePicker, HlmPopoverTrigger],
  templateUrl: './collection-filter-date.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterDate {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description The date currently narrowing the collection, `null` when the field carries none.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Date | null>}
   */
  public readonly value: InputSignal<Date | null> = input.required<Date | null>();

  /**
   * Property placeholder
   * @readonly
   * @description What the trigger reads while no date is set — the field's own label.
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
   * @description Whether the popover is open, driven by the page so a freshly picked field opens itself. See the class doc for how this reaches `HlmDatePicker`'s own popover.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CollectionFilterPopoverState>}
   */
  public readonly state: InputSignal<CollectionFilterPopoverState> =
    input<CollectionFilterPopoverState>('closed');

  /**
   * Property disabled
   * @readonly
   * @description Whether this surface can apply the field at all. Dims the trigger, which stays focusable — see the class doc for why the reason itself is `app-filter-chip`'s to render, not this component's.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property tooltip
   * @readonly
   * @description Inert — see the class doc. `app-filter-chip` (`@shared/collection-filters`) now renders and describes `CollectionFilterField.unavailableReason` itself; this input exists only for homogeneity with `app-collection-filter-select`'s own public API.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly tooltip: InputSignal<string> = input<string>('');

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * The `id` of `app-filter-chip`'s own reason row, when the caller's field
   * is unavailable — set directly on the trigger's `aria-describedby`.
   * Unlike the operator segment and remove button `app-filter-chip` also
   * carries, this trigger cannot discover that id through Angular DI: it
   * arrives in the chip through `NgTemplateOutlet`, from a `ng-template`
   * declared in the owning page rather than inside `FilterChip` itself, and
   * DI resolves against a node's declaration site, never the site it is
   * later rendered at. The owning page knows the reason row's id ahead of
   * time (`CollectionFilterBar.reasonIdFor`'s own deterministic pattern) and
   * passes it here explicitly instead. `undefined` renders no
   * `aria-describedby` at all.
   *
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
   * @description The date after a pick, `null` once the field carries no narrowing any more.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<Date | null>}
   */
  public readonly valueChanged: OutputEmitterRef<Date | null> = output<Date | null>();

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
   * @description The picked date's filled pastille, shared mot pour mot by every value control in this bar.
   * @access protected
   * @since 10.6.0
   * @type {string}
   */
  protected readonly valueClass: string = COLLECTION_FILTER_VALUE_CLASS;

  /**
   * Property picker
   * @readonly
   * @description This instance's own `hlm-date-picker`, so {@link syncPopoverState} and {@link forwardPopoverState} can reach its public `popover` seam. `undefined` until the view initializes.
   * @access protected
   * @since 1.0.0
   * @type {Signal<HlmDatePicker<Date> | undefined>}
   */
  protected readonly picker: Signal<HlmDatePicker<Date> | undefined> =
    viewChild<HlmDatePicker<Date>>(HlmDatePicker);

  /**
   * Property injector
   * @readonly
   * @description This instance's own injector, passed to the `afterNextRender` calls {@link syncPopoverState} schedules — see the class doc for why opening is deferred a render.
   * @access private
   * @since 1.0.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property syncPopoverState
   * @readonly
   * @description Drives {@link picker}'s popover open or closed from {@link state} directly through `BrnOverlay.open()`/`close()` — see the class doc for why this bypasses `HlmDatePicker` entirely rather than rebinding its own internal state input, and why opening is deferred to `afterNextRender`. That deferral is also why the callback re-reads {@link state}: this effect can queue an open and then re-run closed before the render lands, and a callback that trusted its scheduling condition would reopen a popover the caller has already closed.
   * @access private
   * @since 1.0.1
   * @type {EffectRef}
   */
  private readonly syncPopoverState: EffectRef = effect((): void => {
    const popover = this.picker()?.popover();
    if (!popover) return;

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
    const popover = this.picker()?.popover();
    if (!popover) return;

    const subscription = popover.stateChanged.subscribe((state: BrnOverlayState): void =>
      this.stateChanged.emit(state),
    );
    onCleanup((): void => subscription.unsubscribe());
  });
  //#endregion

  //#region Methods
  /**
   * Method onDatePicked
   * @description Reacts to `hlm-date-picker`'s `dateChange`. A no-op while {@link disabled} is set — the trigger stays clickable, so this is what keeps a pick inert rather than merely invisible.
   * @access protected
   * @since 1.0.0
   * @param {Date | null} date - The picker's next date.
   * @returns {void}
   */
  protected onDatePicked(date: Date | null): void {
    if (this.disabled()) return;
    this.valueChanged.emit(date);
  }
  //#endregion
}
