import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideClipboardList,
  lucideCompass,
  lucidePackage,
  lucideSearch,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type {
  OrganizationSearchHitOutput,
  OrganizationSearchResultType,
} from '@features/organization/models';
import {
  ActiveOrganizationStore,
  type ActiveOrganizationStoreType,
} from '@features/organization/state';
import {
  OrganizationSearchStore,
  type OrganizationSearchStoreType,
} from '@features/organization/state/organization-search';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCommandImports } from '@shared/ui/command';
import {
  HlmDialogClose,
  HlmDialogDescription,
  HlmDialogHeader,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmKbdImports } from '@shared/ui/kbd';
import { HlmSpinner } from '@shared/ui/spinner';
import type { OrganizationSearchGroupVm } from './models/organization-search-group-vm.type';

/**
 * Constant SEARCH_GROUP_ORDER
 * @description Stable backend type ordering, retained between keystrokes.
 * @since 1.0.0
 * @type {readonly OrganizationSearchResultType[]}
 */
const SEARCH_GROUP_ORDER: readonly OrganizationSearchResultType[] = [
  'equipment',
  'facility',
  'intervention',
  'inspection',
  'non_conformity',
];

/**
 * Component OrganizationGlobalSearchDialog
 * @class OrganizationGlobalSearchDialog
 *
 * @description
 * Organization-owned command palette with dialog-scoped query state and native
 * Spartan keyboard/focus semantics. The opening organization is fixed until dismissal;
 * closing cancels pending work and the next opening gets a fresh store.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-global-search-dialog',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmCommandImports,
    BrnCommandInput,
    HlmDialogClose,
    HlmDialogDescription,
    HlmDialogHeader,
    HlmDialogTitle,
    HlmKbdImports,
    HlmInputGroupImports,
    HlmSpinner,
  ],
  providers: [
    OrganizationSearchStore,
    provideIcons({
      lucideBuilding2,
      lucideClipboardList,
      lucideCompass,
      lucidePackage,
      lucideSearch,
      lucideTriangleAlert,
      lucideX,
    }),
  ],
  templateUrl: './organization-global-search-dialog.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationGlobalSearchDialog {
  //#region Properties
  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Selects the touch-sized public command-input composition.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property store
   * @readonly
   * @description This dialog's debounced query and results, never shared with slot triggers.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationSearchStoreType}
   */
  protected readonly store: OrganizationSearchStoreType = inject(OrganizationSearchStore);

  /**
   * Property organizationContext
   * @readonly
   * @description Active context used to reject stale results after an organization switch.
   * @access private
   * @since 1.0.0
   * @type {ActiveOrganizationStoreType}
   */
  private readonly organizationContext: ActiveOrganizationStoreType =
    inject(ActiveOrganizationStore);

  /**
   * Property organizationId
   * @readonly
   * @description The organization for which this single dialog was opened.
   * @access private
   * @since 1.0.0
   * @type {string | null}
   */
  private readonly organizationId: string | null =
    this.organizationContext.selectedOrganizationId();

  /**
   * Property router
   * @readonly
   * @description Existing application router, preserving its language/base-path configuration.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property dialogRef
   * @readonly
   * @description Native owning dialog, also used to cancel work at the start of dismissal.
   * @access private
   * @since 1.0.0
   * @type {BrnDialogRef<void>}
   */
  private readonly dialogRef: BrnDialogRef<void> = inject(BrnDialogRef);

  /**
   * Property term
   * @readonly
   * @description Raw query draft used by hints while the store owns debouncing.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly term: WritableSignal<string> = signal('');

  /**
   * Property passThroughFilter
   * @readonly
   * @description Backend results are authoritative and must not be filtered again by the command.
   * @access protected
   * @since 1.0.0
   * @type {(value: string, search: string) => boolean}
   */
  protected readonly passThroughFilter: (value: string, search: string) => boolean = () => true;

  /**
   * Property termLongEnough
   * @readonly
   * @description Whether the draft meets the backend's two-trimmed-character lower bound.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly termLongEnough: Signal<boolean> = computed(
    () => this.term().trim().length >= 2,
  );

  /**
   * Property groups
   * @readonly
   * @description Nonempty result groups in stable type and hit order.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OrganizationSearchGroupVm[]>}
   */
  protected readonly groups: Signal<readonly OrganizationSearchGroupVm[]> = computed(() => {
    const hits = this.store.hits();
    return SEARCH_GROUP_ORDER.map((type): OrganizationSearchGroupVm => ({
      type,
      label: this.groupLabels[type],
      icon: this.groupIcons[type],
      hits: hits.filter((hit) => hit.type === type),
    })).filter((group) => group.hits.length > 0);
  });

  /**
   * Property showNoResults
   * @readonly
   * @description A settled successful search with no hits, distinct from the idle hint.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly showNoResults: Signal<boolean> = computed(
    () => this.store.isQueryLoaded() && this.store.hits().length === 0 && this.termLongEnough(),
  );

  /**
   * Property resultAnnouncement
   * @readonly
   * @description Polite localized announcement of the settled query's result count.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly resultAnnouncement: Signal<string> = computed(() => {
    if (!this.store.isQueryLoaded() || !this.termLongEnough()) return '';
    const count = this.store.hits().length;
    if (count === 0) return $localize`:@@org.search.announce.none:No results`;
    return count === 1
      ? $localize`:@@org.search.announce.one:1 result`
      : $localize`:@@org.search.announce.many:${count}:count: results`;
  });

  /**
   * Property groupLabels
   * @readonly
   * @description Organization-owned localized result group names.
   * @access private
   * @since 1.0.0
   * @type {Readonly<Record<OrganizationSearchResultType, string>>}
   */
  private readonly groupLabels: Readonly<Record<OrganizationSearchResultType, string>> = {
    equipment: $localize`:@@org.search.group.equipment:Equipment`,
    facility: $localize`:@@org.search.group.facility:Facilities`,
    intervention: $localize`:@@org.search.group.intervention:Interventions`,
    inspection: $localize`:@@org.search.group.inspection:Inspections`,
    non_conformity: $localize`:@@org.search.group.nonConformity:Non-conformities`,
  };

  /**
   * Property groupIcons
   * @readonly
   * @description Feature navigation glyphs associated with each result type.
   * @access private
   * @since 1.0.0
   * @type {Readonly<Record<OrganizationSearchResultType, string>>}
   */
  private readonly groupIcons: Readonly<Record<OrganizationSearchResultType, string>> = {
    equipment: 'lucidePackage',
    facility: 'lucideBuilding2',
    intervention: 'lucideCompass',
    inspection: 'lucideClipboardList',
    non_conformity: 'lucideTriangleAlert',
  };
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   * @description Closes stale organization contexts and cancels requests before native exit animations.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.organizationContext.selectedOrganizationId() !== this.organizationId)
        this.dialogRef.close();
    });
    this.dialogRef.closing$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.store.search.destroy();
      this.store.reset();
      this.term.set('');
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchChanged
   * @method onSearchChanged
   * @description Feeds the raw draft to this dialog's debounced query pipeline.
   * @access protected
   * @since 1.0.0
   * @param {string} term - Current command input value.
   * @returns {void}
   */
  protected onSearchChanged(term: string): void {
    if (
      !this.dialogRef.open ||
      this.organizationId === null ||
      this.organizationContext.selectedOrganizationId() !== this.organizationId
    )
      return;
    this.term.set(term);
    this.store.search({ organizationId: this.organizationId, term });
  }

  /**
   * Method onHitSelected
   * @method onHitSelected
   * @description Opens type/id detail routes, or a non-conformity's owning inspection with index fallback.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationSearchHitOutput} hit - Selected backend result, never a transport-provided URL.
   * @returns {void}
   */
  protected onHitSelected(hit: OrganizationSearchHitOutput): void {
    if (
      !this.dialogRef.open ||
      this.organizationId === null ||
      this.organizationContext.selectedOrganizationId() !== this.organizationId
    )
      return;
    const route = this.routeForHit(hit, this.organizationId);
    this.dialogRef.close();
    void this.router.navigate([...route]);
  }

  /**
   * Method routeForHit
   * @description Builds a route from the trusted hit type and identifiers, never from a server URL.
   * @access private
   * @since 1.0.0
   * @param {OrganizationSearchHitOutput} hit - Selected search result.
   * @param {string} organizationId - Active organization.
   * @returns {readonly string[]} Internal route segments.
   */
  private routeForHit(hit: OrganizationSearchHitOutput, organizationId: string): readonly string[] {
    const base: readonly string[] = ['/organizations', organizationId];
    let route: readonly string[];
    switch (hit.type) {
      case 'equipment':
        route = [...base, 'equipments', hit.id];
        break;
      case 'facility':
        route = [...base, 'facilities', hit.id];
        break;
      case 'intervention':
        route = [...base, 'interventions', hit.id];
        break;
      case 'inspection':
        route = [...base, 'inspections', hit.id];
        break;
      default:
        route = [...base, 'inspections'];
        if (hit.parentId) route = [...route, hit.parentId];
    }
    return route;
  }
  //#endregion
}
