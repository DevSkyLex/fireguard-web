import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { TagDescriptor } from './models';
import { tagSeverityIconClass } from './utils';

/**
 * Visual variant of the {@link Tag} component.
 *
 * - `badge` — neutral rounded pill used in table cells and panels.
 * - `inline` — bare icon + label used inside `p-select` option templates,
 *   mirroring the dashboard trend-card filter selects.
 */
export type TagVariant = 'badge' | 'inline';

/**
 * Component Tag
 * @class Tag
 *
 * @description
 * Single source of truth for rendering an enum/status value across the app.
 * Consumes a {@link TagDescriptor} (label + severity + icon) resolved by each
 * feature's own registry, and owns the neutral-pill styling plus the
 * severity → colour mapping so a value looks identical in tables, panels and
 * form selects, and never relies on colour alone to convey meaning.
 *
 * @example
 * ```html
 * <app-tag [descriptor]="statusDescriptor()" />
 * <app-tag [descriptor]="resultDescriptor()" variant="inline" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-tag',
  templateUrl: './tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tag {
  //#region Inputs
  /**
   * Property descriptor
   * @readonly
   *
   * @description
   * Resolved presentation descriptor (label, severity, icon) for the value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TagDescriptor>}
   */
  public readonly descriptor: InputSignal<TagDescriptor> = input.required<TagDescriptor>();

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Visual variant: neutral pill (`badge`) or bare inline content (`inline`).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TagVariant>}
   */
  public readonly variant: InputSignal<TagVariant> = input<TagVariant>('badge');
  //#endregion

  //#region Properties
  /**
   * Property iconClass
   * @readonly
   *
   * @description
   * Compiled class string applying the icon glyph and its severity colour.
   * The badge variant adds sizing utilities so the icon aligns within the
   * pill; the inline variant keeps it bare.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(() => {
    const descriptor: TagDescriptor = this.descriptor();
    const colour: string = tagSeverityIconClass(descriptor.severity);
    return this.variant() === 'badge'
      ? `${descriptor.icon} inline-flex items-center text-[0.7rem] leading-none ${colour}`
      : `${descriptor.icon} ${colour}`;
  });
  //#endregion
}
