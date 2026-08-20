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
  resolveChecklistStatusTag,
  type ChecklistStatus,
  type ChecklistStatusTagDescriptor,
} from '@features/organization/features/checklists/models';
import { HlmBadge } from '@shared/ui/badge';
import { CHECKLIST_STATUS_TAG_ICONS } from './constants/checklist-status-tag-icons.constants';
import { CHECKLIST_STATUS_TAG_ICON_CLASS } from './constants/checklist-status-tag-severity.constants';

/**
 * Component ChecklistStatusTag
 * @class ChecklistStatusTag
 *
 * @description
 * A spartan badge rendering `ChecklistOutput.status` — the single appearance
 * of the enum anywhere in this feature. Resolves the value through the
 * checklist status registry, so the checklists page and its table never
 * branch on the raw string (`ARCHITECTURE.md` §10.10).
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1). {@link asOption} drops the badge for a plain icon-and-label
 * row inside a select or combobox item.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-status-tag [value]="checklist.status" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons(CHECKLIST_STATUS_TAG_ICONS)],
  templateUrl: './checklist-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description The checklist's status to render.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ChecklistStatus>}
   */
  public readonly value: InputSignal<ChecklistStatus> = input.required<ChecklistStatus>();

  /**
   * Property asOption
   * @readonly
   * @description Renders a plain icon-and-label row instead of a badge, for use inside a select or combobox list.
   * @access public
   * @since 1.0.0
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
   * @description Resolved label, severity and icon for the current value.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChecklistStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<ChecklistStatusTagDescriptor> =
    computed<ChecklistStatusTagDescriptor>(() => resolveChecklistStatusTag(this.value()));

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => CHECKLIST_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
