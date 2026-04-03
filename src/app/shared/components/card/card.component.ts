import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, contentChild, input, InputSignal, Signal, signal, TemplateRef } from "@angular/core";
import { CardModule, CardPassThroughOptions } from "primeng/card";

/**
 * Component Card
 * @class Card
 *
 * @description
 * A reusable card component that provides a flexible and customizable container
 * for displaying content.
 *
 * @example ```html
 * <app-card [title]="cardTitle" [description]="cardDescription">
 *  <ng-template #content>
 *    <!-- Custom content goes here -->
 *  </ng-template>
 *  <ng-template #action>
 *    <!-- Custom action buttons or links go here -->
 *  </ng-template>
 *  <ng-template #footer>
 *    <!-- Custom footer content goes here -->
 *  </ng-template>
 * </app-card>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  imports: [CardModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  //#region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * The title of the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> =
    input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * The description of the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> =
    input<string>();

  /**
   * Property action
   * @readonly
   *
   * @description
   * A template reference for the action section
   * of the card, allowing for  custom content such as buttons or links to be
   * injected into the card's action area.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly action: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('action');

  /**
   * Property content
   * @readonly
   *
   * @description
   * A template reference for the main content section
   * of the card, allowing for custom content to be injected into the card's body.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly content: Signal<TemplateRef<unknown>> =
    contentChild.required<TemplateRef<unknown>>('content');

  /**
   * Property footer
   * @readonly
   *
   * @description
   * A template reference for the footer section of the card,
   * allowing for custom content to be injected into the card's
   * footer area, such as additional information or links.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly footer: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('footer');

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Pass-through options for the PrimeNG Card component, allowing for
   * customization of the card's appearance and behavior.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class: 'h-full flex flex-col gap-4 border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    content: {
      class: 'px-4 pb-4 flex-1',
    },
    header: {
      class: 'px-4 pt-4',
    },
    footer: {
      class: 'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 px-4 py-3 rounded-b-md',
    },
  };
  //#endregion
}
