import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronsUpDown,
  lucideEllipsis,
  lucideShieldCheck,
  lucideTrash2,
} from '@ng-icons/lucide';
import type {
  OrganizationMemberListSort,
  OrganizationMemberOutput,
  OrganizationMemberSortField,
} from '@features/organization/models';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component OrganizationMemberTable
 * @class OrganizationMemberTable
 *
 * @description
 * The members grid, built the way this codebase's other permission-aware
 * tables are (`InterventionTable`): `hlmTable` inside a bordered, scrollable
 * shell, a leading checkbox column for bulk removal, an avatar-and-name cell
 * linking to the member's profile, role badges, an active/inactive badge
 * that pairs a label with the state (never colour alone, `PRODUCT.md`), and
 * a trailing `…` menu.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. `canRemove` and `canAssignRoles` are two independent
 * permissions on the backend (`organization.members.manage` and
 * `organization.roles.manage`) and are gated separately here rather than
 * folded into one flag, so a member holding only one of the two sees only
 * the control that would not 403. The checkbox column itself only renders
 * when `canRemove` is granted, since selection exists solely to feed the
 * page's bulk-remove action.
 *
 * "Member" (`displayName`) and "Joined" (`joinedAt`) are sortable heads,
 * mirroring `InterventionTable`'s ghost-button + direction-glyph pattern —
 * the backend's own sort whitelist (`ListOrganizationMembersProvider`) has
 * no other orderable field.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-member-table',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmBadge,
    HlmButton,
    HlmCheckbox,
    HlmSkeleton,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideChevronsUpDown,
      lucideEllipsis,
      lucideShieldCheck,
      lucideTrash2,
    }),
  ],
  templateUrl: './organization-member-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The members to render — already loaded and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationMemberOutput[]>}
   */
  public readonly items: InputSignal<readonly OrganizationMemberOutput[]> =
    input.required<readonly OrganizationMemberOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property selectedIds
   * @readonly
   * @description Ids of the currently selected rows, owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly selectedIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property canRemove
   * @readonly
   * @description Whether the checkbox column and the row/bulk Remove action may render (`organization.members.manage`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canRemove: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canAssignRoles
   * @readonly
   * @description Whether the row menu may offer role assignment (`organization.roles.manage`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canAssignRoles: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments the row link appends the member id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property sortOrder
   * @readonly
   * @description The active ordering, deciding what each sortable head announces and which direction glyph it shows.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<OrganizationMemberListSort>}
   */
  public readonly sortOrder: InputSignal<OrganizationMemberListSort> =
    input.required<OrganizationMemberListSort>();
  //#endregion

  //#region Outputs
  /**
   * Property selectionChanged
   * @readonly
   * @description The selected row ids changed. Carries the full next selection, not a delta.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ReadonlySet<string>>}
   */
  public readonly selectionChanged: OutputEmitterRef<ReadonlySet<string>> =
    output<ReadonlySet<string>>();

  /**
   * Property manageRolesRequested
   * @readonly
   * @description A row menu asked to open the role-assignment dialog for this member.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationMemberOutput>}
   */
  public readonly manageRolesRequested: OutputEmitterRef<OrganizationMemberOutput> =
    output<OrganizationMemberOutput>();

  /**
   * Property removeRequested
   * @readonly
   * @description A row menu asked for this member to be removed. The table never removes: the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationMemberOutput>}
   */
  public readonly removeRequested: OutputEmitterRef<OrganizationMemberOutput> =
    output<OrganizationMemberOutput>();

  /**
   * Property sortChanged
   * @readonly
   * @description A sortable head was activated; carries the field. Re-emitting the active field means "reverse it" — the page owns the direction.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<OrganizationMemberSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<OrganizationMemberSortField> =
    output<OrganizationMemberSortField>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

  /**
   * Property allSelected
   * @readonly
   * @description Whether every currently rendered row is selected, driving the header checkbox's checked state.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly allSelected: Signal<boolean> = computed<boolean>(() => {
    const rows: readonly OrganizationMemberOutput[] = this.items();
    const selected: ReadonlySet<string> = this.selectedIds();

    return (
      rows.length > 0 &&
      rows.every((member: OrganizationMemberOutput): boolean => selected.has(member.id))
    );
  });

  /**
   * Property someSelected
   * @readonly
   * @description Whether some but not all rendered rows are selected, driving the header checkbox's indeterminate state.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly someSelected: Signal<boolean> = computed<boolean>(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return (
      !this.allSelected() &&
      this.items().some((member: OrganizationMemberOutput): boolean => selected.has(member.id))
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method isSelected
   * @description Whether a row's checkbox is currently checked.
   * @access protected
   * @since 1.0.0
   * @param {string} id - The row's member id.
   * @returns {boolean} True when selected.
   */
  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  /**
   * Method toggleAll
   * @description Selects or deselects every currently rendered row, preserving a selection made elsewhere.
   * @access protected
   * @since 1.0.0
   * @param {boolean} checked - The header checkbox's new state.
   * @returns {void}
   */
  protected toggleAll(checked: boolean): void {
    const next: Set<string> = new Set(this.selectedIds());

    for (const member of this.items()) {
      if (checked) next.add(member.id);
      else next.delete(member.id);
    }

    this.selectionChanged.emit(next);
  }

  /**
   * Method toggleRow
   * @description Selects or deselects a single row.
   * @access protected
   * @since 1.0.0
   * @param {string} id - The row's member id.
   * @param {boolean} checked - The row checkbox's new state.
   * @returns {void}
   */
  protected toggleRow(id: string, checked: boolean): void {
    const next: Set<string> = new Set(this.selectedIds());

    if (checked) next.add(id);
    else next.delete(id);

    this.selectionChanged.emit(next);
  }

  /**
   * Method nameOf
   * @description The name a row shows: the API's `displayName`, or the first/last name pair, or the email, in that order.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {string} The name to render.
   */
  protected nameOf(member: OrganizationMemberOutput): string {
    if (member.displayName) return member.displayName;

    const composed: string = [member.firstName, member.lastName].filter((part) => !!part).join(' ');
    if (composed) return composed;

    return member.email ?? $localize`:@@org.members.table.unnamed:Member`;
  }

  /**
   * Method initialsOf
   * @description Fallback shown while a row's avatar is missing or still loading.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {string} Up to two uppercase initials.
   */
  protected initialsOf(member: OrganizationMemberOutput): string {
    return this.nameOf(member)
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * Method selectRowLabel
   * @description The accessible name for a row's checkbox, naming the member rather than leaving every checkbox on the page announced identically.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The member's name.
   * @returns {string} The localized label.
   */
  protected selectRowLabel(name: string): string {
    return $localize`:@@org.members.table.rowSelectLabel:Select ${name}:name:`;
  }

  /**
   * Method columnCount
   * @description How many cells a row currently has, so the empty-state message can span the full width. The leading checkbox column only renders when `canRemove` is granted.
   * @access protected
   * @since 1.2.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return this.canRemove() ? 7 : 6;
  }

  /**
   * Method ariaSort
   * @description What a sortable head announces for the active ordering.
   * @access protected
   * @since 1.2.0
   * @param {OrganizationMemberSortField} field - The head's field.
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: OrganizationMemberSortField): 'ascending' | 'descending' | 'none' {
    const active: OrganizationMemberListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @description The glyph a sortable head shows: a direction when it is the active one, a neutral pair otherwise.
   * @access protected
   * @since 1.2.0
   * @param {OrganizationMemberSortField} field - The head's field.
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: OrganizationMemberSortField): string {
    const active: OrganizationMemberListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
