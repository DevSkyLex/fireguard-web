import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { MessageReferenceOutput } from '@features/collaboration/models';

/**
 * Presentation for each record type a message can point at.
 *
 * Severity is paired with an icon and a label so the card never conveys its
 * meaning by colour alone.
 */
const REFERENCE_PRESENTATION: Readonly<
  Record<MessageReferenceOutput['type'], { readonly icon: string; readonly danger: boolean }>
> = {
  non_conformity: { icon: 'pi pi-exclamation-triangle', danger: true },
  intervention: { icon: 'pi pi-compass', danger: false },
  facility: { icon: 'pi pi-map', danger: false },
  equipment: { icon: 'pi pi-box', danger: false },
};

/**
 * Component MessageReferenceCard
 * @class MessageReferenceCard
 *
 * @description
 * The card a message shows for a structured reference to a domain record — a
 * non-conformity, an intervention, a facility or a piece of equipment.
 *
 * `label` and `code` are the only two genuinely nullable fields in the whole
 * messaging contract, so both are guarded rather than assumed.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-reference-card [reference]="reference" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-reference-card',
  imports: [],
  templateUrl: './message-reference-card.component.html',
  host: { class: 'block max-w-[480px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageReferenceCard {
  //#region Inputs
  /**
   * Property reference
   * @readonly
   *
   * @description
   * The reference to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageReferenceOutput>}
   */
  public readonly reference: InputSignal<MessageReferenceOutput> =
    input.required<MessageReferenceOutput>();
  //#endregion

  //#region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class for the reference's record type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed(
    (): string => REFERENCE_PRESENTATION[this.reference().type].icon,
  );

  /**
   * Property danger
   * @readonly
   *
   * @description
   * Whether the referenced record is a problem to act on, which a
   * non-conformity is and the others are not.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly danger: Signal<boolean> = computed(
    (): boolean => REFERENCE_PRESENTATION[this.reference().type].danger,
  );

  /**
   * Property title
   * @readonly
   *
   * @description
   * Best available heading: the record's label, its code, or a neutral
   * fallback naming the type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed((): string => {
    const reference: MessageReferenceOutput = this.reference();

    return reference.label ?? reference.code ?? this.typeLabel(reference.type);
  });
  //#endregion

  //#region Methods
  /**
   * Method typeLabel
   * @method typeLabel
   *
   * @description
   * Human-readable name of a record type, used both as the card's kicker and
   * as the fallback title.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageReferenceOutput['type']} type - Referenced record type.
   *
   * @return {string} The localized type name.
   */
  protected typeLabel(type: MessageReferenceOutput['type']): string {
    switch (type) {
      case 'non_conformity':
        return $localize`:@@workspace.reference.nonConformity:Non-conformity`;
      case 'intervention':
        return $localize`:@@workspace.reference.intervention:Intervention`;
      case 'facility':
        return $localize`:@@workspace.reference.facility:Facility`;
      default:
        return $localize`:@@workspace.reference.equipment:Equipment`;
    }
  }
  //#endregion
}
