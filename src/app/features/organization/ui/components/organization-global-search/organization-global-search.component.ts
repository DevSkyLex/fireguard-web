import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideClipboardList,
  lucideCompass,
  lucidePackage,
  lucideSearch,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  OrganizationSearchHitOutput,
  OrganizationSearchResultType,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { ActiveOrganizationStoreType } from '@features/organization/state';
import {
  OrganizationSearchStore,
  type OrganizationSearchStoreType,
} from '@features/organization/state/organization-search';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCommandImports } from '@shared/ui/command';
import { HlmKbdImports } from '@shared/ui/kbd';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Constant SEARCH_GROUP_ORDER
 *
 * @description
 * The stable type order the backend answers in, replayed for grouping so
 * the palette never reorders between keystrokes.
 *
 * @since 1.0.0
 *
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
 * Type OrganizationSearchGroupVm
 *
 * @description
 * View-model for one rendered result group: the human label, the lucide
 * icon the navigation already uses for the section, and its hits.
 *
 * @since 1.0.0
 */
type OrganizationSearchGroupVm = {
  readonly type: OrganizationSearchResultType;
  readonly label: string;
  readonly icon: string;
  readonly hits: readonly OrganizationSearchHitOutput[];
};

/**
 * Component OrganizationGlobalSearch
 * @class OrganizationGlobalSearch
 *
 * @description
 * The shell's global search: a header magnifier button and the Ctrl+K /
 * Cmd+K command palette it opens, contributed to the dashboard layout's
 * header-actions slot the same way the assistant toggle is. Absent entirely
 * outside an organization — the endpoint is organization-scoped, so a
 * trigger without an active organization only leads to nothing.
 *
 * The dialog hosts spartan's command primitive, which carries the
 * combobox/listbox ARIA contract (`role="combobox"`, `aria-expanded`,
 * `aria-activedescendant`, one `option` per hit) and the keyboard model
 * (arrows, Home/End, Enter). Filtering is disabled (`passThroughFilter`):
 * the backend already answers exactly the hits for the term, and re-filtering
 * server results client-side would second-guess its matching rules.
 *
 * Selection navigates by `type` + `id` — the API deliberately ships no URL:
 * equipment, facility, intervention and inspection each go to their detail
 * route. A non-conformity has no detail page of its own (and its hit does
 * not carry the owning inspection's id), so it lands on the inspections
 * index — the closest surface that exists.
 *
 * Closing resets the store and hands focus back to the trigger explicitly,
 * covering the Ctrl+K opening where the dialog's own focus restoration has
 * nothing useful to return to.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-global-search />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-global-search',
  imports: [NgIcon, HlmBadge, HlmButton, HlmCommandImports, ...HlmKbdImports, HlmSpinner],
  providers: [
    OrganizationSearchStore,
    provideIcons({
      lucideBuilding2,
      lucideClipboardList,
      lucideCompass,
      lucidePackage,
      lucideSearch,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './organization-global-search.component.html',
  host: {
    class: 'contents',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationGlobalSearch {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped owner of the debounced search query state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationSearchStoreType}
   */
  protected readonly store: OrganizationSearchStoreType =
    inject<OrganizationSearchStoreType>(OrganizationSearchStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Names the organization every search is scoped to.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStoreType}
   */
  protected readonly organizationContext: ActiveOrganizationStoreType =
    inject<ActiveOrganizationStoreType>(ActiveOrganizationStore);

  /** @access private @since 1.0.0 @type {Router} */
  private readonly router: Router = inject<Router>(Router);

  /** Whether the palette dialog is open. */
  protected readonly open: WritableSignal<boolean> = signal<boolean>(false);

  /** The raw, un-debounced term currently typed — drives the "keep typing" hint. */
  protected readonly term: WritableSignal<string> = signal<string>('');

  /**
   * Property shortcutModifier
   * @readonly
   *
   * @description
   * The modifier key named on the trigger's visible hint. Starts at the
   * non-Apple label so the server and the first client render agree, then
   * corrects to the command glyph on Apple platforms after hydration.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly shortcutModifier: WritableSignal<string> = signal<string>('Ctrl');

  /** The header trigger button, focused back explicitly when the palette closes. */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** Pass-through: server results are already filtered — never hide one client-side. */
  protected readonly passThroughFilter: (value: string, search: string) => boolean = () => true;

  /** Whether the trimmed term is long enough for the backend (2 characters). */
  protected readonly termLongEnough: Signal<boolean> = computed<boolean>(
    () => this.term().trim().length >= 2,
  );

  /**
   * Property groups
   * @readonly
   *
   * @description
   * The last successful hit list grouped by type in the backend's stable
   * order, empty groups dropped.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationSearchGroupVm[]>}
   */
  protected readonly groups: Signal<readonly OrganizationSearchGroupVm[]> = computed(() => {
    const hits: readonly OrganizationSearchHitOutput[] = this.store.hits();

    return SEARCH_GROUP_ORDER.map((type): OrganizationSearchGroupVm => ({
      type,
      label: this.groupLabels[type],
      icon: this.groupIcons[type],
      hits: hits.filter((hit) => hit.type === type),
    })).filter((group) => group.hits.length > 0);
  });

  /** Whether the palette shows the "no results" state: a settled, successful search with zero hits. */
  protected readonly showNoResults: Signal<boolean> = computed<boolean>(
    () => this.store.isQueryLoaded() && this.store.hits().length === 0 && this.termLongEnough(),
  );

  /** The polite live-region line announcing the result count of the settled search. */
  protected readonly resultAnnouncement: Signal<string> = computed<string>(() => {
    if (!this.store.isQueryLoaded() || !this.termLongEnough()) return '';

    const count: number = this.store.hits().length;

    if (count === 0) return $localize`:@@org.search.announce.none:No results`;

    return count === 1
      ? $localize`:@@org.search.announce.one:1 result`
      : $localize`:@@org.search.announce.many:${count}:count: results`;
  });

  /** Human group labels, keyed by hit type. */
  private readonly groupLabels: Readonly<Record<OrganizationSearchResultType, string>> = {
    equipment: $localize`:@@org.search.group.equipment:Equipment`,
    facility: $localize`:@@org.search.group.facility:Facilities`,
    intervention: $localize`:@@org.search.group.intervention:Interventions`,
    inspection: $localize`:@@org.search.group.inspection:Inspections`,
    non_conformity: $localize`:@@org.search.group.nonConformity:Non-conformities`,
  };

  /** The lucide icon per group — the same glyphs the navigation and the sections' own pages use. */
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
   * Method constructor
   * @method constructor
   *
   * @description
   * Resolves the platform-specific modifier for the trigger's visible
   * shortcut hint. Deferred through `afterNextRender` rather than read at
   * construction because the app renders on the server, where the label
   * would otherwise disagree with the hydrated one.
   *
   * @access public
   * @since 1.1.0
   */
  constructor() {
    afterNextRender(() => {
      if (/Mac|iPhone|iPad|iPod/i.test(globalThis.navigator.userAgent)) {
        this.shortcutModifier.set('⌘');
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onDocumentKeydown
   * @method onDocumentKeydown
   *
   * @description
   * Opens (or toggles) the palette on Ctrl+K / Cmd+K, the shortcut the
   * trigger advertises through `aria-keyshortcuts`. Inactive without an
   * active organization, like the trigger itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The document-level keydown.
   *
   * @returns {void}
   */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return;
    if (this.organizationContext.selectedOrganizationId() === null) return;

    event.preventDefault();
    this.open.update((open) => !open);
  }

  /**
   * Method onDialogStateChange
   * @method onDialogStateChange
   *
   * @description
   * Mirrors the dialog's own state (Escape, backdrop) into {@link open};
   * a closing dialog also resets the query and returns focus to the trigger.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's reported state.
   *
   * @returns {void}
   */
  protected onDialogStateChange(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    this.open.set(isOpen);

    if (!isOpen) this.onClosed();
  }

  /**
   * Method onSearchChanged
   * @method onSearchChanged
   *
   * @description
   * Records the keystroke and feeds the store's debounced pipeline — the
   * store decides whether the settled term is long enough to dial.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} term - The raw palette input value.
   *
   * @returns {void}
   */
  protected onSearchChanged(term: string): void {
    this.term.set(term);

    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    this.store.search({ organizationId, term });
  }

  /**
   * Method onHitSelected
   * @method onHitSelected
   *
   * @description
   * Navigates to the hit's own surface and closes the palette. Routes are
   * built from `type` + `id`; a non-conformity, having no detail page (its
   * hit carries no inspection id), lands on the inspections index.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationSearchHitOutput} hit - The picked result.
   *
   * @returns {void}
   */
  protected onHitSelected(hit: OrganizationSearchHitOutput): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    const base: readonly string[] = ['/organizations', organizationId];

    const route: readonly string[] =
      hit.type === 'equipment'
        ? [...base, 'equipments', hit.id]
        : hit.type === 'facility'
          ? [...base, 'facilities', hit.id]
          : hit.type === 'intervention'
            ? [...base, 'interventions', hit.id]
            : hit.type === 'inspection'
              ? [...base, 'inspections', hit.id]
              : hit.parentId
                ? [...base, 'inspections', hit.parentId]
                : [...base, 'inspections'];

    this.open.set(false);
    this.onClosed();

    void this.router.navigate([...route]);
  }

  /**
   * Method onClosed
   * @method onClosed
   *
   * @description
   * The one closing path: clears the draft term, resets the store and hands
   * focus back to the trigger.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private onClosed(): void {
    this.term.set('');
    this.store.reset();
    this.trigger()?.nativeElement.focus();
  }
  //#endregion
}
