import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsis, lucidePencil, lucideTrash2, lucideUsersRound } from '@ng-icons/lucide';
import type { TeamOutput } from '@features/organization/models';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmTableImports } from '@shared/ui/table';

/** How many cells a row carries, so the shared surface can size its first-load skeleton. */
const COLUMN_COUNT: number = 5;

/** One literal Tailwind width per rendered column, for the shared surface's first-load skeleton. */
const SKELETON_COLUMN_WIDTHS: ReadonlyArray<string> = [
  'w-32',
  'w-48',
  'w-16',
  'w-20',
  'ms-auto size-6',
];

/**
 * Component OrganizationTeamTable
 * @class OrganizationTeamTable
 *
 * @description
 * The teams grid, built the way this codebase's other permission-aware
 * tables are (`OrganizationMemberTable`): `hlmTable` inside a bordered,
 * scrollable shell, name/description/member-count/created columns, and a
 * trailing `…` menu carrying Edit (`organization.teams.write`), Members
 * (always — the page itself is gated on `organization.teams.read`), and
 * Delete (`organization.teams.manage`).
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service; the page owns the actual edit/delete/members workflows.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    CollectionSurface,
    NgIcon,
    HlmButton,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideEllipsis, lucidePencil, lucideTrash2, lucideUsersRound })],
  templateUrl: './organization-team-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The teams to render — already loaded by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly TeamOutput[]>}
   */
  public readonly items: InputSignal<readonly TeamOutput[]> =
    input.required<readonly TeamOutput[]>();

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
   * Property canEdit
   * @readonly
   * @description Whether the row menu may offer Edit (`organization.teams.write`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canEdit: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canDelete
   * @readonly
   * @description Whether the row menu may offer Delete (`organization.teams.manage`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canDelete: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   * @description A row menu asked to edit this team.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TeamOutput>}
   */
  public readonly editRequested: OutputEmitterRef<TeamOutput> = output<TeamOutput>();

  /**
   * Property membersRequested
   * @readonly
   * @description A row menu asked to open the member roster for this team.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TeamOutput>}
   */
  public readonly membersRequested: OutputEmitterRef<TeamOutput> = output<TeamOutput>();

  /**
   * Property deleteRequested
   * @readonly
   * @description A row menu asked to delete this team. The table never deletes: the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TeamOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<TeamOutput> = output<TeamOutput>();
  //#endregion

  //#region Properties
  /** How many cells a row carries, handed to the shared surface. */
  protected readonly columnCount: number = COLUMN_COUNT;

  /** One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. */
  protected readonly skeletonColumnWidths: ReadonlyArray<string> = SKELETON_COLUMN_WIDTHS;
  //#endregion

  //#region Methods
  /**
   * Method memberCountLabel
   * @description The localized, pluralized member count for a row.
   * @access protected
   * @since 1.0.0
   * @param {number} count - The team's `memberCount`.
   * @returns {string} The localized label.
   */
  protected memberCountLabel(count: number): string {
    return count === 1
      ? $localize`:@@org.teams.table.memberCountOne:1 member`
      : $localize`:@@org.teams.table.memberCountMany:${count}:count: members`;
  }
  //#endregion
}
