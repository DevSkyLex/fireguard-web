import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDotDashed, lucidePackage } from '@ng-icons/lucide';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/** Placeholder rows drawn while the tab's own fetch is in flight. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

/**
 * Component InterventionEquipmentTable
 * @class InterventionEquipmentTable
 *
 * @description
 * The Equipment tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the equipment scoped to this intervention through
 * the backend's canonical `intervention` search filter, with a "Show more"
 * button appending further pages. No search, no row actions. A row's type
 * links to the equipment's own record, with an accessible name folding in
 * the serial number ({@link linkAriaLabelOf}) so repeated identical type
 * labels across rows stay distinguishable to assistive tech — unless the
 * row is still an intervention-scoped draft, which does not resolve on the
 * canonical route yet and renders as plain text with an outline "Draft"
 * badge instead (icon + label, never colour-only).
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-equipment-table',
  imports: [
    NgIcon,
    RouterLink,
    EmptyState,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    InterventionTag,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleDotDashed, lucidePackage })],
  templateUrl: './intervention-equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionEquipmentTable {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the intervention, so a row can link into its equipment's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property items
   * @readonly
   * @description The equipment linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether the tab's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The tab's own fetch error, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property totalItems
   * @readonly
   * @description Total linked equipment the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked equipment is being fetched.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property loadMoreRequested
   * @readonly
   * @description Emits when the user asks for the next page of linked equipment.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMoreRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   *
   * @description
   * The equipment's type, humanized. The backend field is a free-form string
   * (organization-configurable equipment types), not a closed enum, so this
   * only normalizes punctuation rather than resolving a registry entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string} The humanized type.
   */
  protected typeLabelOf(item: EquipmentOutput): string {
    return item.type.replace(/_/g, ' ');
  }

  /**
   * Method brandModelOf
   * @description The brand and model, joined for one cell, or `null` when neither is set.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} item - The equipment being rendered.
   * @returns {string | null} The joined label, or `null`.
   */
  protected brandModelOf(item: EquipmentOutput): string | null {
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/equipments/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: EquipmentOutput): boolean {
    return item.recordStatus === 'draft';
  }

  /**
   * Method linkAriaLabelOf
   *
   * @description
   * The row's link accessible name, folding in the serial number so two
   * rows sharing the same type — the link's own visible text — stay
   * distinguishable to assistive tech. `null` when there is no serial to
   * disambiguate with, which drops the attribute and falls back to the
   * link's own text content.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string | null} The accessible name, or `null`.
   */
  protected linkAriaLabelOf(item: EquipmentOutput): string | null {
    if (!item.serialNumber) return null;

    const type: string = this.typeLabelOf(item);
    const serial: string = item.serialNumber;

    return $localize`:@@intervention.linked.equipment.linkAriaLabel:${type}:type: (${serial}:serial:)`;
  }
  //#endregion
}
