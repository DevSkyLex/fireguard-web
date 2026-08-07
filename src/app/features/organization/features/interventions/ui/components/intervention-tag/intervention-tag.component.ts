import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  resolveInterventionTag,
  type InterventionTagDescriptor,
  type InterventionTagKind,
} from '@features/organization/features/interventions/models';
import { HlmBadge } from '@shared/ui/badge';
import { INTERVENTION_TAG_ICONS } from './constants/intervention-tag-icons.constants';
import { INTERVENTION_TAG_ICON_CLASS } from './constants/intervention-tag-severity.constants';

/**
 * Component InterventionTag
 * @class InterventionTag
 *
 * @description
 * A spartan badge rendering one intervention enum value — the single
 * appearance of a status, priority, type or work-item state anywhere in the
 * feature.
 *
 * It resolves a `kind`/`value` pair through the intervention registry, so
 * adding an enum member means editing one descriptor map.
 *
 * Drawn the way spartan's dashboard draws a status: an `outline` badge with a
 * transparent ground and muted text, where only the glyph carries the tone. A
 * row of filled pills would shout over the data. The icon and the label always
 * render, so the value survives without its colour (WCAG 1.4.1).
 *
 * Inside a select or combobox list, {@link asOption} drops the badge and
 * renders the same icon and label as a plain row: a pill nested inside an
 * already-padded option row reads as two controls stacked rather than one
 * choice, and no other option in these lists (site, member, page size) is a
 * badge either.
 *
 * @version 4.0.0
 *
 * @example
 * ```html
 * <app-intervention-tag kind="status" value="in_progress" />
 * <app-intervention-tag kind="priority" value="urgent" asOption />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons(INTERVENTION_TAG_ICONS)],
  templateUrl: './intervention-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTag {
  //#region Inputs
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Enum family the value belongs to, deciding which descriptor map resolves
   * it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTagKind>}
   */
  public readonly kind: InputSignal<InterventionTagKind> = input.required<InterventionTagKind>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Raw enum value to render, e.g. `"urgent"` or `"in_progress"`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property asOption
   * @readonly
   *
   * @description
   * Renders a plain icon-and-label row instead of a badge, for use inside a
   * select or combobox list.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly asOption: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });
  //#endregion

  //#region Properties
  /**
   * Property descriptor
   * @readonly
   *
   * @description
   * Resolved label, severity and icon for the current pair.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionTagDescriptor>}
   */
  protected readonly descriptor: Signal<InterventionTagDescriptor> =
    computed<InterventionTagDescriptor>(() => resolveInterventionTag(this.kind(), this.value()));

  /**
   * Property iconClass
   * @readonly
   *
   * @description
   * The severity's colour, applied to the glyph alone — the badge itself stays
   * neutral.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => INTERVENTION_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
