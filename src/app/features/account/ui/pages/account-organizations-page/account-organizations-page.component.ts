import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
  type EffectRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2 } from '@ng-icons/lucide';
import { AccountLeaveOrganizationDialog } from '@features/account/ui/dialogs/account-leave-organization-dialog';
import type { OrganizationOutput } from '@features/organization/models';
import { MY_ORGANIZATIONS_PORT, type MyOrganizationsPort } from '@features/organization/ports';
import { OrganizationAvatar } from '@features/organization/ui/components';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AccountOrganizationsPage
 * @class AccountOrganizationsPage
 *
 * @description
 * `/account/organizations` — the caller's own organization memberships, with
 * a self-service "Leave" per row, reachable regardless of any organization
 * permission (`features/account/FEATURE.md`, `features/organization/FEATURE.md`
 * Invariants). Consumes `MY_ORGANIZATIONS_PORT` rather than any organization
 * store directly: `account` may not import `features/organization` internals
 * across the feature boundary (`AGENTS.md`).
 *
 * Leaving the organization currently open in the workspace navigates back to
 * `/organizations`, which re-resolves the next accessible workspace (or
 * onboarding) through the existing guard chain — mirroring
 * `OrganizationSettingsPage`'s `navigateAwayOnLeave`. Leaving any other
 * organization only removes its row.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-organizations-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    AccountLeaveOrganizationDialog,
    OrganizationAvatar,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmItemImports,
  ],
  providers: [provideIcons({ lucideBuilding2 })],
  templateUrl: './account-organizations-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOrganizationsPage implements OnInit {
  //#region Properties
  /**
   * Property myOrganizations
   * @readonly
   * @description Organization-owned port publishing the caller's own memberships and the leave capability.
   * @access protected
   * @since 1.0.0
   * @type {MyOrganizationsPort}
   */
  protected readonly myOrganizations: MyOrganizationsPort =
    inject<MyOrganizationsPort>(MY_ORGANIZATIONS_PORT);

  /**
   * Property router
   * @readonly
   * @description Used to leave for the organization redirector once the active organization has been left.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property confirmingLeaveId
   * @readonly
   * @description The organization id pending confirmation in the leave dialog, or `null` when closed.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly confirmingLeaveId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property leavingOrganizationName
   * @readonly
   * @description The name of the organization named in the open leave dialog.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly leavingOrganizationName: Signal<string> = computed((): string => {
    const id: string | null = this.confirmingLeaveId();
    if (id === null) return '';

    return this.myOrganizations.organizations().find((org) => org.id === id)?.name ?? '';
  });

  /**
   * Property isEmpty
   * @readonly
   * @description Whether the list has landed empty — never true in practice (every member belongs to at least one organization), kept for the loading/error-free empty case.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed(
    (): boolean =>
      !this.myOrganizations.isLoadingOrganizations() &&
      this.myOrganizations.organizations().length === 0,
  );

  /**
   * Property leftOrganizationId
   *
   * @description
   * The organization id the in-flight leave call targeted, or `null` once
   * {@link navigateAwayOnLeaveActive} has consumed a success. Gating on this
   * field rather than on a previous-status edge keeps the effect idempotent:
   * a signals flush that coalesces the `pending` and `success` `CallState`
   * writes into one tick — observed under WebKit — would make a
   * previous-status comparison miss the transition and leave the dialog
   * open forever.
   *
   * @access private
   * @since 1.0.0
   * @type {string | null}
   */
  private leftOrganizationId: string | null = null;

  /**
   * Property navigateAwayOnLeaveActive
   * @readonly
   *
   * @description
   * Once leaving succeeds, closes the dialog; if the left organization was
   * the one open in the workspace, also returns to `/organizations` so the
   * reader is never left on a dead page — mirroring
   * `OrganizationSettingsPage`'s `navigateAwayOnLeave`. Leaving any other
   * organization stays on this page with the row removed.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly navigateAwayOnLeaveActive: EffectRef = effect((): void => {
    const status: string = this.myOrganizations.leaveCallState().status;
    const leftId: string | null = this.leftOrganizationId;

    if (status !== 'success' || leftId === null) return;

    untracked((): void => {
      this.leftOrganizationId = null;
      this.confirmingLeaveId.set(null);
      if (leftId === this.myOrganizations.activeOrganizationId()) {
        void this.router.navigate(['/organizations']);
      }
    });
  });
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   * @description Loads the caller's organization list.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public ngOnInit(): void {
    this.myOrganizations.loadOrganizations();
  }
  //#endregion

  //#region Methods
  /**
   * Method isActive
   * @method isActive
   * @description Whether the given organization is the one currently open in the workspace.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationOutput} organization - The row's organization.
   * @returns {boolean}
   */
  protected isActive(organization: OrganizationOutput): boolean {
    return organization.id === this.myOrganizations.activeOrganizationId();
  }

  /**
   * Method openLeaveDialog
   * @method openLeaveDialog
   * @description Opens the leave confirmation for one organization.
   * @access protected
   * @since 1.0.0
   * @param {string} organizationId - The organization to leave.
   * @returns {void}
   */
  protected openLeaveDialog(organizationId: string): void {
    this.myOrganizations.resetLeaveOperation();
    this.confirmingLeaveId.set(organizationId);
  }

  /**
   * Method confirmLeave
   * @method confirmLeave
   * @description Leaves the organization named by {@link confirmingLeaveId}.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmLeave(): void {
    const organizationId: string | null = this.confirmingLeaveId();
    if (organizationId === null) return;

    this.leftOrganizationId = organizationId;
    this.myOrganizations.leave(organizationId);
  }

  /**
   * Method onLeaveDialogVisibleChange
   * @method onLeaveDialogVisibleChange
   * @description Closes the dialog on a dismissal (Cancel or Escape).
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's reported visibility.
   * @returns {void}
   */
  protected onLeaveDialogVisibleChange(visible: boolean): void {
    if (!visible) this.confirmingLeaveId.set(null);
  }
  //#endregion
}
