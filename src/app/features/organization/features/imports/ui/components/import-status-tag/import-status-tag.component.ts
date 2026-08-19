import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucideCircleX,
  lucideClock,
  lucideLoaderCircle,
  lucideTag,
} from '@ng-icons/lucide';
import {
  resolveImportStatusTag,
  type ImportStatusTagDescriptor,
} from '@features/organization/features/imports/models';
import { HlmBadge } from '@shared/ui/badge';
import { IMPORT_STATUS_TAG_ICON_CLASS } from './constants/import-status-tag-severity.constants';

/**
 * Component ImportStatusTag
 * @class ImportStatusTag
 *
 * @description
 * A spartan badge rendering one `ImportJobStatus` value — the single
 * appearance of the enum anywhere in this feature. Resolves {@link value}
 * through `resolveImportStatusTag`, so adding a status member later means
 * editing one descriptor map.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-import-status-tag value="processing" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-import-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [
    provideIcons({ lucideCircleCheck, lucideCircleX, lucideClock, lucideLoaderCircle, lucideTag }),
  ],
  templateUrl: './import-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw status value to render, e.g. `"processing"`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property descriptor
   * @readonly
   * @description Resolved label, severity and icon for the current value.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ImportStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<ImportStatusTagDescriptor> =
    computed<ImportStatusTagDescriptor>(() => resolveImportStatusTag(this.value()));

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => IMPORT_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
