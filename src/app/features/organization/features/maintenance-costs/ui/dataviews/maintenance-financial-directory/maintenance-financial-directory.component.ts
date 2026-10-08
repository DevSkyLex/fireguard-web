import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, FormRoot, maxLength, type FieldTree } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type {
  MaintenanceFinancialDossierOutput,
  MaintenanceFinancialEquipmentIdentity,
  MaintenanceReportScopeSelection,
} from '@features/organization/features/maintenance-costs/models';
import { CollectionPagination } from '@shared/collection-pagination';
import {
  OrgDatePipe,
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface FinancialSearchDraft
 * @interface FinancialSearchDraft
 *
 * @description
 * Local search text is independent of private server directory replies.
 */
interface FinancialSearchDraft {
  /**
   * Property search
   *
   * @description
   * Work reference or name, limited to the server's 160-character bound.
   *
   * @type {string}
   */
  search: string;
}

/**
 * Class MaintenanceFinancialDirectory
 * @class MaintenanceFinancialDirectory
 *
 * @description
 * Renders a bounded named financial directory and emits filter intent without reading ordinary
 * equipment or customer APIs.
 */
@Component({
  selector: 'app-maintenance-financial-directory',
  templateUrl: './maintenance-financial-directory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    NgIcon,
    CollectionPagination,
    OrgDatePipe,
    ResourceIllustration,
    StateIllustration,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmFieldImports,
    ...HlmItemImports,
  ],
  providers: [provideIcons({ lucideCircleAlert })],
})
export class MaintenanceFinancialDirectory {
  //#region Properties
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Explicit organization date display settings, independent of the UTC report selection window.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization used solely for private financial dossier links.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property items
   * @readonly
   *
   * @description
   * Current bounded server page of minimal financial identities, never a complete resource
   * catalogue.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly MaintenanceFinancialDossierOutput[]>}
   */
  public readonly items: InputSignal<readonly MaintenanceFinancialDossierOutput[]> = input<
    readonly MaintenanceFinancialDossierOutput[]
  >([]);

  /**
   * Property page
   * @readonly
   *
   * @description
   * Actual one-based financial directory page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input(1);

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Server directory page size, independent of report allocation pagination.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly itemsPerPage: InputSignal<number> = input(25);

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Full matching directory count supplied by the server, including unloaded pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input(0);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Directory read state keeps received rows visible while a newer search is in progress.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized directory read failure; it never resets the search draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property search
   * @readonly
   *
   * @description
   * Initial or explicitly reset server search; ordinary reads do not replace edited text.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly search: InputSignal<string> = input('');

  /**
   * Property scope
   * @readonly
   *
   * @description
   * Organization and authenticated-session identity that resets private search text on replacement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly scope: InputSignal<string> = input.required<string>();

  /**
   * Property resetToken
   * @readonly
   *
   * @description
   * Explicit directory reset supplied by the page, separate from ordinary response refreshes.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly resetToken: InputSignal<number> = input(0);

  /**
   * Property searchSubmitted
   * @readonly
   *
   * @description
   * Emits normalized bounded search intent; the page restarts directory pagination at one.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchSubmitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Requests another server directory page without downloading a full option catalogue.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property pageSizeChanged
   * @readonly
   *
   * @description
   * Requests a new bounded directory page size.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageSizeChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property scopeSelected
   * @readonly
   *
   * @description
   * Emits the complete compatible named scope selection rather than merging unrelated filters.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenanceReportScopeSelection>}
   */
  public readonly scopeSelected: OutputEmitterRef<MaintenanceReportScopeSelection> =
    output<MaintenanceReportScopeSelection>();

  /**
   * Property retryRequested
   * @readonly
   *
   * @description
   * Requests a fresh directory read while retaining scope and local search text.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Number of directory navigation pages derived solely from server count and page size.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / Math.max(1, this.itemsPerPage()))),
  );

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Local name/reference search survives pending, failed and ordinary successful reads.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<FinancialSearchDraft>}
   */
  protected readonly draft: WritableSignal<FinancialSearchDraft> = signal({ search: '' });

  /**
   * Property searchForm
   * @readonly
   *
   * @description
   * Native Signal Form enforces the directory's 160-character search bound.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<FinancialSearchDraft>}
   */
  protected readonly searchForm: FieldTree<FinancialSearchDraft> = form(this.draft, (path) => {
    maxLength(path.search, 160, {
      message: $localize`:@@maintenanceCost.directory.searchTooLong:Use at most 160 characters for the work reference or name.`,
    });
  });

  /**
   * Property seededScope
   *
   * @description
   * Last explicit reset identity prevents response-driven loss of search edits.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private seededScope: string = '';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Adopts search text only at initialization or an explicit organization/session reset.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const identity = `${this.scope()}/${this.resetToken()}`,
        search = this.search();
      if (identity === this.seededScope) return;
      this.seededScope = identity;
      untracked(() => this.searchForm().reset({ search }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits an explicitly submitted bounded search while leaving asynchronous reads to the page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native search form submission event.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.searchForm().markAsTouched();
    if (this.searchForm().invalid() || this.pending()) return;
    this.searchSubmitted.emit(this.draft().search.trim());
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Clears only the local search and emits empty search intent without changing financial scope.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected clearSearch(): void {
    if (this.pending()) return;
    this.searchForm().reset({ search: '' });
    this.searchSubmitted.emit('');
  }

  /**
   * Method equipmentLabel
   * @method equipmentLabel
   *
   * @description
   * Names an equipment choice using authorized patrimonial identity and never a raw UUID fallback.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceFinancialEquipmentIdentity} equipment - Minimal financial equipment
   *   identity.
   *
   * @returns {string} Named equipment, asset reference or explicit missing label.
   */
  protected equipmentLabel(equipment: MaintenanceFinancialEquipmentIdentity): string {
    if (equipment.assetReference && equipment.name)
      return `${equipment.assetReference} · ${equipment.name}`;
    return (
      equipment.assetReference ||
      equipment.name ||
      $localize`:@@maintenanceCost.directory.unnamedEquipment:Unnamed equipment`
    );
  }

  /**
   * Method equipmentAssignmentKey
   * @method equipmentAssignmentKey
   *
   * @description
   * Distinguishes one asset's captured site and customer assignments in the financial directory.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceFinancialEquipmentIdentity} equipment - Captured minimal assignment.
   *
   * @returns {string} Stable equipment, site and customer identity tuple.
   */
  protected equipmentAssignmentKey(equipment: MaintenanceFinancialEquipmentIdentity): string {
    return `${equipment.id}:${equipment.site?.id ?? ''}:${equipment.customer?.id ?? ''}`;
  }

  /**
   * Method selectEquipment
   * @method selectEquipment
   *
   * @description
   * Emits the selected equipment's own named site/customer scope; unavailable historical context
   * remains absent rather than inheriting a different dossier target.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceFinancialEquipmentIdentity} equipment - Equipment selected from that
   *   dossier.
   *
   * @returns {void} No return value.
   */
  protected selectEquipment(equipment: MaintenanceFinancialEquipmentIdentity): void {
    if (this.pending()) return;
    this.scopeSelected.emit({
      equipment,
      ...(equipment.site ? { site: equipment.site } : {}),
      ...(equipment.customer ? { customer: equipment.customer } : {}),
    });
  }

  /**
   * Method snapshotLabel
   * @method snapshotLabel
   *
   * @description
   * Distinguishes recorded publication identity, current work and historical missing snapshots.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceFinancialDossierOutput['snapshotState']} state - Server snapshot
   *   availability.
   *
   * @returns {string} Localized financial identity provenance.
   */
  protected snapshotLabel(state: MaintenanceFinancialDossierOutput['snapshotState']): string {
    switch (state) {
      case 'available':
        return $localize`:@@maintenanceCost.directory.published:Published snapshot`;
      case 'snapshot_missing':
        return $localize`:@@maintenanceCost.directory.missing:Historical snapshot missing`;
      default:
        return $localize`:@@maintenanceCost.directory.live:Current work`;
    }
  }
  //#endregion
}
