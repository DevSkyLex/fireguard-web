import type { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkDropList as CdkDropListDirective } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  type InterventionListFilters,
  type InterventionOutput,
  type InterventionStatus,
  type MemberSelectOption,
  resolveInterventionTag,
} from '@features/organization/features/interventions/models';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import { isInterventionBoardMoveAllowed } from '@features/organization/features/interventions/utils';
import {
  buildInterventionListOptions,
  parseInterventionListFilters,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButtonGroupImports } from '@shared/ui/button-group';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import { InterventionBoardCard } from '../../components/intervention-board-card';
import { INTERVENTION_BOARD_COLUMNS } from './constants';
import type { InterventionBoardCardViewModel } from './models';

/** How long typing settles before the search reaches the wire — mirrors `InterventionsPage`. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The one server page the board loads — the store's own single-page-replace mechanism (see class doc). */
const BOARD_PAGE_SIZE: number = 200;

/**
 * Component InterventionsBoardPage
 * @class InterventionsBoardPage
 *
 * @description
 * The Kanban view over the same organization interventions dataset
 * `InterventionsPage` renders as a table — a sibling leaf under the
 * interventions feature's pathless parent, so both share the one
 * `InterventionStore` (`FEATURE.md` "one shared dataset"). One column per
 * `InterventionStatus`, in workflow order (`INTERVENTION_BOARD_COLUMNS`),
 * labelled through the same `models/intervention-tag/` registry the list and
 * detail pages use.
 *
 * **Paging.** `InterventionStore.load` fetches and replaces exactly one
 * server page, the same mechanism the list page uses — there is no new
 * endpoint. The board asks for one large page (`BOARD_PAGE_SIZE`, 200) so a
 * typical organization's open work fits in a single load and is distributed
 * across every column at once; an organization past that count sees only its
 * first 200 (by `dueAt`), a stated trade-off rather than a second pagination
 * surface layered onto a Kanban board. `status` is never part of the query —
 * the columns themselves are the status narrowing.
 *
 * **Filters.** The URL's narrowing (every field `InterventionsPage` reads,
 * `status` excluded — it has no meaning here) is parsed and applied the same
 * way the list page's own `filters()` is, so navigating from a filtered list
 * to the board keeps the same subset in view. Unlike the list page, this
 * first cut does not render the full editable Linear-style filter bar
 * (`app-collection-filter-bar`) — replicating its eight chip templates here
 * is populated-UI-scale work, deliberately left as a follow-up
 * (`fg-spartan-ui`/`fg-component-builder`); only the search box is repeated
 * for parity. The board still fully **applies** whatever filters the
 * incoming URL already carries.
 *
 * **Drag-drop legality.** `isInterventionBoardMoveAllowed` — the card's
 * server `allowedTransitions` plus the `canWithdraw` gate for
 * submitted → in_progress — governs both `cdkDropListEnterPredicate` and the
 * card's own "Move to…" menu, so the pointer-drag path and the click/keyboard
 * path can never disagree. A card whose id is in
 * `store.transitioningInterventionIds()` is drag-locked and its menu
 * disabled entirely, since its cached `allowedTransitions`/`revision` are
 * stale mid-flight (`InterventionStore.transition`'s own doc).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-board-page',
  imports: [
    RouterLink,
    CdkDropListDirective,
    InterventionBoardCard,
    CollectionToolbar,
    CollectionSearchBox,
    HlmBadge,
    ...HlmButtonGroupImports,
  ],
  providers: [InterventionPlanningOptionsStore],
  templateUrl: './interventions-board-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionsBoardPage {
  //#region Inputs
  /** The workspace whose interventions are boarded, bound from the route. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The search term the URL carries. See {@link InterventionsPage.q}. */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The type filter the URL carries. */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The priority filter the URL carries. */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The site filter the URL carries, as a raw facility id. */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The responsible filter the URL carries, as a raw member id. */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The label filter the URL carries, as a raw label id. */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?mine=1` narrows to the signed-in member (responsible OR participant). */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The named due-date window the URL carries. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Deadline" narrowing's lower bound, `YYYY-MM-DD`. */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Deadline" narrowing's upper bound, `YYYY-MM-DD`. */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Planned start" narrowing's lower bound, `YYYY-MM-DD`. */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The "Planned start" narrowing's upper bound, `YYYY-MM-DD`. */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  //#endregion

  //#region Properties
  /** The shared dataset, provided by the pathless parent route. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Member choices, resolving each card's responsible avatar. */
  private readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /** Gates whether a card's "Move to…" menu and drag surface offer status changes at all. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Round-trips `?q=` and reads the current query params for the "List" toggle link. */
  private readonly router: Router = inject(Router);

  /** Hosts the DOM lookup {@link requestMove} needs to restore focus after a cross-column move. */
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  /** Anchors the {@link requestMove} post-render focus restoration outside the injection context. */
  private readonly injector: Injector = inject(Injector);

  /** Anchors the relative query-param navigation. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The narrowing the URL carries, `status` excluded — it has no meaning on the board. */
  protected readonly filters: Signal<InterventionListFilters> = computed<InterventionListFilters>(
    () =>
      parseInterventionListFilters(
        {
          type: this.type(),
          priority: this.priority(),
          site: this.site(),
          responsible: this.responsible(),
          label: this.label(),
          mine: this.mine(),
          due: this.due(),
          dueAfter: this.dueAfter(),
          dueBefore: this.dueBefore(),
          plannedStartAfter: this.plannedStartAfter(),
          plannedStartBefore: this.plannedStartBefore(),
        },
        this.organizationId(),
      ),
  );

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The search as everything downstream reads it: trimmed, never `undefined`. */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /** Where a card's title link points. */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /** Every query param the list view should keep when the operator switches back — the board never carries `status`, so nothing to strip. */
  protected readonly listQueryParams: Signal<Record<string, string | null>> = computed(() => ({
    q: this.q() ?? null,
    type: this.type() ?? null,
    priority: this.priority() ?? null,
    site: this.site() ?? null,
    responsible: this.responsible() ?? null,
    label: this.label() ?? null,
    mine: this.mine() ?? null,
    due: this.due() ?? null,
    dueAfter: this.dueAfter() ?? null,
    dueBefore: this.dueBefore() ?? null,
    plannedStartAfter: this.plannedStartAfter() ?? null,
    plannedStartBefore: this.plannedStartBefore() ?? null,
  }));

  /** The board's fixed column order. */
  protected readonly columns: readonly InterventionStatus[] = INTERVENTION_BOARD_COLUMNS;

  /**
   * `cdkDropList` ids, one per column, for `cdkDropListConnectedTo` — typed
   * as a mutable array because that input's own type is, even though nothing
   * here mutates it.
   */
  protected readonly dropListIds: string[] = INTERVENTION_BOARD_COLUMNS.map(
    (status: InterventionStatus): string => this.dropListId(status),
  );

  /** Whether the "Move to…" menu and drag surface may offer status changes at all. */
  protected readonly canTransition: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
    ]),
  );

  /** Members keyed by IRI, resolving a card's responsible option. */
  private readonly memberDisplayMap: Signal<ReadonlyMap<string, MemberSelectOption>> = computed(
    (): ReadonlyMap<string, MemberSelectOption> =>
      new Map(
        this.planningOptions
          .members()
          .map((member: MemberSelectOption): [string, MemberSelectOption] => [
            member.value,
            member,
          ]),
      ),
  );

  /** Every loaded intervention, grouped by status in {@link columns} order. */
  protected readonly board: Signal<
    ReadonlyMap<InterventionStatus, readonly InterventionBoardCardViewModel[]>
  > = computed((): ReadonlyMap<InterventionStatus, readonly InterventionBoardCardViewModel[]> => {
    const items: readonly InterventionBoardCardViewModel[] = this.store
      .interventionList()
      .map((intervention: InterventionOutput): InterventionBoardCardViewModel =>
        this.toCardViewModel(intervention),
      );

    const grouped = new Map<InterventionStatus, InterventionBoardCardViewModel[]>();
    for (const status of this.columns) grouped.set(status, []);
    for (const item of items) grouped.get(item.intervention.status)?.push(item);

    return grouped;
  });

  /** Ids of the cards whose own transition is currently in flight — drag-locked and menu-disabled. */
  protected readonly transitioningIds: Signal<readonly string[]> =
    this.store.transitioningInterventionIds;

  /** The `aria-live="polite"` announcement text — reflects the last optimistic move. */
  protected readonly liveMessage: WritableSignal<string> = signal<string>('');
  //#endregion

  /**
   * Wires the search round-trip, the board's own load effect and the
   * planning options fetch — mirrors `InterventionsPage`'s constructor.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const term: string = this.searchTerm();
      untracked((): void => {
        if (term !== this.draftSearch()) this.draftSearch.set(term);
      });
    });

    toObservable(this.draftSearch)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        if (term !== this.searchTerm()) this.navigateQuery({ q: term === '' ? null : term });
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const filters: InterventionListFilters = this.filters();
      const search: string = this.searchTerm();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(
              filters,
              { field: 'dueAt', direction: 'asc' },
              search,
              new Date(),
              null,
            ),
            page: 1,
            itemsPerPage: BOARD_PAGE_SIZE,
          },
        });
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.planningOptions.loadCreationOptions(organizationId);
      });
    });
  }

  //#region Methods
  /** Merges query params into the URL without touching the path. */
  private navigateQuery(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The search box's value changed. */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /** The `cdkDropList` id for a status column. */
  protected dropListId(status: InterventionStatus): string {
    return `intervention-board-column-${status}`;
  }

  /** Names a status for a column header. */
  protected statusLabelOf(status: InterventionStatus): string {
    return resolveInterventionTag('status', status).label;
  }

  /**
   * Method columnCountLabelOf
   * @description The count badge's accessible name — a bare number reached out of context (a rotor list, element navigation) needs its column named.
   * @access protected
   * @since 1.0.0
   * @param {InterventionStatus} status - The column's status.
   * @returns {string} The localized label.
   */
  protected columnCountLabelOf(status: InterventionStatus): string {
    const count: number = (this.board().get(status) ?? []).length;
    const statusLabel: string = this.statusLabelOf(status);

    return $localize`:@@intervention.board.columnCount:${count}:count: interventions in ${statusLabel}:status:`;
  }

  /**
   * Method canDrop
   * @description Whether a dragged card may enter a given column — the drag-surface half of the legality check the card's own "Move to…" menu also applies.
   * @access protected
   * @since 1.0.0
   * @param {CdkDrag<InterventionOutput>} drag - The card being dragged.
   * @param {CdkDropList<InterventionStatus>} drop - The column being entered.
   * @returns {boolean} True when the drop is legal.
   */
  protected canDrop = (
    drag: CdkDrag<InterventionOutput>,
    drop: CdkDropList<InterventionStatus>,
  ): boolean => {
    const intervention: InterventionOutput = drag.data;
    if (!this.canTransition() || this.transitioningIds().includes(intervention.id)) return false;

    return isInterventionBoardMoveAllowed(intervention, drop.data);
  };

  /**
   * Method onDropped
   * @method onDropped
   *
   * @description
   * A card was dropped onto a column. A drop back onto its own column is a
   * no-op; a legal cross-column drop calls `InterventionStore.transition`,
   * which owns the optimistic patch, the `If-Match` revision and the
   * rollback + toast on failure — the board only announces the optimistic
   * move for assistive technology.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<InterventionStatus>} event - The CDK drop event.
   *
   * @returns {void}
   */
  protected onDropped(event: CdkDragDrop<InterventionStatus, InterventionStatus>): void {
    if (event.previousContainer === event.container) return;

    const intervention: InterventionOutput = event.item.data as InterventionOutput;
    const target: InterventionStatus = event.container.data;
    this.requestMove(intervention, target);
  }

  /**
   * Method requestMove
   * @description The single entry point both the drop handler and each card's "Move to…" menu call — re-validates legality defensively, dispatches the transition, announces it, and restores keyboard focus onto the moved card's title link: the optimistic move re-parents the card into another column's `@for`, so Angular destroys and recreates its DOM node and the menu's own focus-restore would land on a detached element, dropping focus to `<body>`.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - The card's intervention.
   * @param {InterventionStatus} target - The requested status.
   * @returns {void}
   */
  protected requestMove(intervention: InterventionOutput, target: InterventionStatus): void {
    if (!isInterventionBoardMoveAllowed(intervention, target)) return;

    this.store.transition({ id: intervention.id, status: target, revision: intervention.revision });
    this.liveMessage.set(
      $localize`:@@intervention.board.moved:Moved ${intervention.name}:name: to ${this.statusLabelOf(target)}:status:.`,
    );
    afterNextRender(
      (): void => {
        this.elementRef.nativeElement
          .querySelector<HTMLAnchorElement>(
            `[data-intervention-id="${intervention.id}"] a[data-testid="intervention-board-card-title"]`,
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Projects one intervention into the board card view model. */
  private toCardViewModel(intervention: InterventionOutput): InterventionBoardCardViewModel {
    const dueTime: number | null = intervention.dueAt
      ? new Date(intervention.dueAt).getTime()
      : null;
    const isTerminal: boolean =
      intervention.status === 'published' || intervention.status === 'abandoned';

    return {
      intervention,
      isOverdue: dueTime !== null && !isTerminal && dueTime < Date.now(),
      responsible: intervention.responsible
        ? (this.memberDisplayMap().get(intervention.responsible) ?? null)
        : null,
    };
  }
  //#endregion
}
