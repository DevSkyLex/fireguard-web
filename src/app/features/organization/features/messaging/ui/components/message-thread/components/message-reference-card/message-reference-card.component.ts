import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  MessageReference,
  MessageReferenceType,
} from '@features/organization/features/messaging/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';

/**
 * Route segment each reference type is reachable at, under
 * `/organizations/{organizationId}`.
 *
 * `non_conformity` is deliberately absent: the app exposes no non-conformity
 * page, and its inspection is not carried on the reference, so the card is
 * rendered non-interactive rather than pointed at an invented route.
 */
const ROUTE_SEGMENT: Readonly<Partial<Record<MessageReferenceType, string>>> = {
  facility: 'facilities',
  equipment: 'equipments',
  intervention: 'interventions',
};

/**
 * Component MessageReferenceCard
 * @class MessageReferenceCard
 *
 * @description
 * One record card attached to a message: icon tile, title, the record kind, and
 * its code when the backend sent one.
 *
 * A non-conformity reads as danger — a warning tile on a tinted, red-bordered
 * card — but never by colour alone: the kind is always spelled out under the
 * title (PRODUCT.md).
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
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './message-reference-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageReferenceCard {
  //#region Inputs
  /**
   * Property reference
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageReference>}
   */
  public readonly reference: InputSignal<MessageReference> = input.required<MessageReference>();
  //#endregion

  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The active organization, whose id every record route is scoped by.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property isDanger
   * @readonly
   *
   * @description
   * Whether the referenced record is a non-conformity, the one kind the card
   * renders as a danger surface.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDanger: Signal<boolean> = computed(
    (): boolean => this.reference().type === 'non_conformity',
  );

  /**
   * Property routeLink
   * @readonly
   *
   * @description
   * Where the card navigates, or `null` when the referenced kind has no page —
   * the card is then rendered as plain content, not as a dead link.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[] | null>}
   */
  protected readonly routeLink: Signal<readonly string[] | null> = computed(
    (): readonly string[] | null => {
      const segment: string | undefined = ROUTE_SEGMENT[this.reference().type];
      const organizationId: string | undefined =
        this.organizationContext.selectedOrganization()?.id;

      if (segment === undefined || organizationId === undefined) return null;

      return ['/organizations', organizationId, segment, this.reference().id];
    },
  );

  /**
   * Property icon
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed((): string => {
    switch (this.reference().type) {
      case 'non_conformity':
        return 'pi pi-exclamation-triangle';
      case 'intervention':
        return 'pi pi-wrench';
      case 'facility':
        return 'pi pi-building';
      default:
        return 'pi pi-box';
    }
  });

  /**
   * Property tileClass
   * @readonly
   *
   * @description
   * Icon-tile colours: danger for a non-conformity, primary for an
   * intervention (the workflow the brand accent is reserved for), neutral for
   * the two asset kinds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly tileClass: Signal<string> = computed((): string => {
    switch (this.reference().type) {
      case 'non_conformity':
        return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400';
      case 'intervention':
        return 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400';
      default:
        return 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400';
    }
  });

  /**
   * Property typeLabel
   * @readonly
   *
   * @description
   * The record kind, spelled out. Always rendered: it is what keeps the danger
   * variant from carrying its meaning in colour alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly typeLabel: Signal<string> = computed((): string => {
    switch (this.reference().type) {
      case 'non_conformity':
        return $localize`:@@messaging.reference.type.nonConformity:Non-conformity`;
      case 'intervention':
        return $localize`:@@messaging.reference.type.intervention:Intervention`;
      case 'facility':
        return $localize`:@@messaging.reference.type.facility:Facility`;
      default:
        return $localize`:@@messaging.reference.type.equipment:Equipment`;
    }
  });

  /**
   * Property title
   * @readonly
   *
   * @description
   * The card's headline: the backend label when it sent one, the record kind
   * otherwise. `label` is omitted from the JSON when null, so it is read
   * through a `typeof` check rather than a `!== null` guard.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed((): string => {
    const label: string | null | undefined = this.reference().label;

    return typeof label === 'string' && label.trim().length > 0 ? label : this.typeLabel();
  });

  /**
   * Property code
   * @readonly
   *
   * @description
   * The record's human code (`FG-NC-231`), or `null` when the payload omitted
   * it — which is what an absent, "nullable" API field looks like.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly code: Signal<string | null> = computed((): string | null => {
    const code: string | null | undefined = this.reference().code;

    return typeof code === 'string' && code.trim().length > 0 ? code : null;
  });
  //#endregion
}
