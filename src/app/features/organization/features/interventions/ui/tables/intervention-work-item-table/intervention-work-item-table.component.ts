import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TableModule, type TablePassThroughOptions } from 'primeng/table';
import type {
  InterventionWorkItemOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * Component InterventionWorkItemTable
 * @class InterventionWorkItemTable
 *
 * @description
 * Presentational table rendering the prepared work items of an intervention,
 * aligned with the other organization tables. Resolves each row's target and
 * assignee from the identities embedded on the work item (falling back to the
 * provided option lists for optimistic items), and stays read-only: it owns no
 * loading, navigation or persistence concerns.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-table',
  imports: [TableModule, InterventionMemberOption, InterventionTag],
  templateUrl: './intervention-work-item-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemTable {
  //#region Inputs
  /**
   * Input workItems
   * @readonly
   *
   * @description
   * Work item rows displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Input memberOptions
   * @readonly
   *
   * @description
   * Organization member options used to resolve an assignee that is not yet
   * embedded on the work item (optimistic items created offline).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Input targetOptions
   * @readonly
   *
   * @description
   * Target options (facilities and equipment) used to resolve a target label
   * that is not yet embedded on the work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  //#endregion

  //#region Properties
  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes matching the organization tables, with a
   * top divider and rounded bottom so the table sits flush inside its section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
   */
  protected readonly tablePt: TablePassThroughOptions = {
    root: { class: 'w-full' },
    table: { class: 'w-full text-sm' },
    tableContainer: {
      class: 'overflow-hidden border-t border-surface-200 dark:border-surface-800',
    },
    pcPaginator: {
      root: {
        class:
          'justify-end border-t border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900',
      },
    },
  };

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Page size for the work item table. Pagination is only enabled once the
   * work item count exceeds this threshold, so short lists stay paginator-free.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {number}
   */
  protected readonly rows: number = 10;
  //#endregion

  //#region Methods
  /**
   * Method workItemTarget
   * @method workItemTarget
   *
   * @description
   * Resolves a human-readable target label: the identity embedded by the API
   * first, then the matching target option, the raw value when it is free text,
   * and null for unresolved resource IRIs (not useful to the user).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {string | null} Display label, or null when nothing useful to show.
   */
  protected workItemTarget(item: InterventionWorkItemOutput): string | null {
    if (item.targetSummary) return item.targetSummary.label;

    const target: string | null = item.target;
    if (!target) return null;

    const option: SelectOption | undefined = this.targetOptions().find(
      (candidate: SelectOption): boolean => candidate.value === target,
    );
    if (option) return option.label;

    return target.startsWith('/api/') ? null : target;
  }

  /**
   * Method workItemAssignee
   * @method workItemAssignee
   *
   * @description
   * Resolves the member option assigned to a work item, preferring the identity
   * embedded by the API and falling back to the member options for optimistic
   * items, or null when the item is unassigned.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {MemberSelectOption | null} Assigned member option, if any.
   */
  protected workItemAssignee(item: InterventionWorkItemOutput): MemberSelectOption | null {
    const profile = item.assigneeProfile;
    if (profile) {
      return {
        label: profile.displayName,
        value: profile.member,
        displayName: profile.displayName,
        roleLabel: '',
        avatarUrl: profile.avatarUrl,
        initials: this.deriveInitials(profile.displayName),
      };
    }

    if (!item.assignee) return null;

    return (
      this.memberOptions().find(
        (option: MemberSelectOption): boolean => option.value === item.assignee,
      ) ?? null
    );
  }

  /**
   * Method deriveInitials
   * @method deriveInitials
   *
   * @description
   * Derives up to two uppercase initials from a display name for the avatar
   * fallback shown when the assignee has no avatar image.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} displayName - Assignee display name.
   *
   * @returns {string} Up to two uppercase initials, or '?' when none.
   */
  private deriveInitials(displayName: string): string {
    return (
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string): string => part.charAt(0))
        .join('')
        .toUpperCase() || '?'
    );
  }
  //#endregion
}
