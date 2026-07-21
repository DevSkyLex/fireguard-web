import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { ComplianceRollup } from '@features/organization/features/compliance/data-access/adapters/compliance-totals.adapter';
import type { ComplianceFacilityRow } from '@features/organization/features/compliance/models';
import {
  ComplianceSummaryStore,
  type ComplianceSummaryStoreType,
} from '@features/organization/features/compliance/state';
import { ComplianceFacilityTable } from '@features/organization/features/compliance/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';
import { Skeleton } from '@shared/components';

/**
 * Which section of the register is on screen.
 *
 * @since 1.0.0
 */
export type ComplianceTab = 'overview' | 'sites';

/**
 * Component CompliancePage
 * @class CompliancePage
 *
 * @description
 * The organization's compliance register: an equipment-coverage rollup and the
 * per-site breakdown behind it.
 *
 * Tabs are `?tab=` rather than child routes because both sections come from one
 * query behind one permission — the query-param rule from the refonte plan. The
 * page is **additive**: it does not replace `/inspections`, which is gated on a
 * different permission.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance',
  imports: [
    ButtonModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    SelectButtonModule,
    ComplianceFacilityTable,
    Skeleton,
  ],
  providers: [ComplianceSummaryStore],
  templateUrl: './compliance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompliancePage {
  //#region Inputs
  /**
   * Input tab
   * @readonly
   *
   * @description
   * Active section, bound from `?tab=`. Anything unrecognised reads as the
   * overview rather than rendering nothing.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly tab: InputSignal<string> = input<string>('overview');
  //#endregion

  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ComplianceSummaryStoreType}
   */
  protected readonly store: ComplianceSummaryStoreType =
    inject<ComplianceSummaryStoreType>(ComplianceSummaryStore);

  /**
   * Property activeTab
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ComplianceTab>}
   */
  protected readonly activeTab: Signal<ComplianceTab> = computed(
    (): ComplianceTab => (this.tab() === 'sites' ? 'sites' : 'overview'),
  );

  /**
   * Property rollup
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ComplianceRollup>}
   */
  protected readonly rollup: Signal<ComplianceRollup> = computed(
    (): ComplianceRollup => this.store.rollup(),
  );

  /**
   * Property coverageLabel
   * @readonly
   *
   * @description
   * The headline rate, or an em dash when nothing is tracked — the backend
   * returns `null` there, and "no schedule yet" is not "0% compliant".
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly coverageLabel: Signal<string> = computed((): string => {
    const rate: number | null = this.rollup().complianceRate;
    return rate === null ? '—' : `${Math.round(rate)}%`;
  });

  /**
   * Property openNonConformities
   * @readonly
   *
   * @description
   * Open non-conformities across every severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly openNonConformities: Signal<number> = computed((): number => {
    const rollup: ComplianceRollup = this.rollup();
    return (
      rollup.openCriticalNonConformityCount +
      rollup.openHighNonConformityCount +
      rollup.openMediumNonConformityCount +
      rollup.openLowNonConformityCount
    );
  });

  /** Free-text filter over site name and path. */
  protected readonly siteSearch: WritableSignal<string> = signal<string>('');

  /**
   * Attention filter for the site register.
   *
   * The register is read to answer "which sites need me", so the filter is
   * built from that question rather than from the row's own status field —
   * a site can be `active` and still be the most overdue one on the estate.
   */
  protected readonly siteFilter: WritableSignal<'all' | 'overdue' | 'dueSoon'> = signal<
    'all' | 'overdue' | 'dueSoon'
  >('all');

  /** Options of the attention filter. */
  protected readonly siteFilterOptions: ReadonlyArray<{
    readonly label: string;
    readonly value: 'all' | 'overdue' | 'dueSoon';
  }> = [
    { label: $localize`:@@compliance.filter.all:All sites`, value: 'all' },
    { label: $localize`:@@compliance.filter.overdue:Overdue`, value: 'overdue' },
    { label: $localize`:@@compliance.filter.dueSoon:Due soon`, value: 'dueSoon' },
  ];

  /** Rows left by the search and the attention filter. */
  protected readonly visibleFacilities: Signal<readonly ComplianceFacilityRow[]> = computed(
    (): readonly ComplianceFacilityRow[] => {
      const term: string = this.siteSearch().trim().toLowerCase();
      const filter: 'all' | 'overdue' | 'dueSoon' = this.siteFilter();

      return this.store.facilities().filter((row: ComplianceFacilityRow): boolean => {
        if (filter === 'overdue' && row.overdueEquipmentCount === 0) return false;
        if (filter === 'dueSoon' && row.dueSoonEquipmentCount === 0) return false;
        if (term === '') return true;

        return `${row.name} ${row.path}`.toLowerCase().includes(term);
      });
    },
  );

  /** True when the search or filter excluded every site — not "no sites". */
  protected readonly hasNoMatch: Signal<boolean> = computed(
    (): boolean => this.store.facilities().length > 0 && this.visibleFacilities().length === 0,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the register for the active organization.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load(
      computed(
        (): string | null => this.activeOrganizationStore.selectedOrganization()?.id ?? null,
      ),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method selectTab
   *
   * @description
   * Switches section through `?tab=`, keeping the overview off the URL so the
   * default stays clean.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ComplianceTab} tab - The section to show.
   *
   * @returns {void}
   */
  protected selectTab(tab: ComplianceTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method retry
   *
   * @description
   * Re-runs the register query after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.load(this.activeOrganizationStore.selectedOrganization()?.id ?? null);
  }

  /**
   * Method openFacility
   *
   * @description
   * Opens the site a register row stands for. The register is read to find the
   * site that needs attention, and going there is the only thing left to do
   * once it is found.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {ComplianceFacilityRow} row - Activated register row.
   *
   * @returns {void}
   */
  protected openFacility(row: ComplianceFacilityRow): void {
    const organizationId: string | null =
      this.activeOrganizationStore.selectedOrganization()?.id ?? null;
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'facilities', row.facilityId]);
  }
  //#endregion
}
