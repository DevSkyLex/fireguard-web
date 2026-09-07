import { ClipboardModule } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy, lucideGlobe, lucideCircleAlert } from '@ng-icons/lucide';
import type {
  OrganizationAccessPolicyInput,
  OrganizationAccessPolicyOutput,
  OrganizationDomainOutput,
} from '@features/organization/models';
import { OrganizationAccessPolicyForm } from '@features/organization/ui/forms/organization-access-policy-form';
import { OrganizationDomainForm } from '@features/organization/ui/forms/organization-domain-form';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
/**
 * Component OrganizationAccessPanel
 * @class OrganizationAccessPanel
 * @description Presentational admission policy and DNS challenge panel. The page owns permission gating, loading and mutations; clipboard handling reports success or failure.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-access-panel',
  imports: [
    ClipboardModule,
    NgIcon,
    OrganizationAccessPolicyForm,
    OrganizationDomainForm,
    HlmAlertImports,
    HlmItemImports,
    HlmBadge,
    HlmButton,
    HlmDialogImports,
    HlmEmptyImports,
    HlmSkeleton,
  ],
  providers: [provideIcons({ lucideCopy, lucideGlobe, lucideCircleAlert })],
  templateUrl: './organization-access-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAccessPanel {
  /**
   * Property policy
   * @readonly
   * @description Loaded policy or null before first load.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationAccessPolicyOutput | null>}
   */
  public readonly policy: InputSignal<OrganizationAccessPolicyOutput | null> =
    input<OrganizationAccessPolicyOutput | null>(null);
  /**
   * Property loading
   * @readonly
   * @description Initial or refresh request state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
  /**
   * Property pending
   * @readonly
   * @description Policy or domain mutation state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property policyRevision
   * @readonly
   * @description Forwards successful policy saves and organization changes independently of domain refreshes.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly policyRevision: InputSignal<number> = input(0);
  /**
   * Property error
   * @readonly
   * @description Recoverable server error.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property policySubmitted
   * @readonly
   * @description Confirmed policy update.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationAccessPolicyInput>}
   */
  public readonly policySubmitted: OutputEmitterRef<OrganizationAccessPolicyInput> = output();
  /**
   * Property domainAdded
   * @readonly
   * @description Domain submitted for verification setup.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly domainAdded: OutputEmitterRef<string> = output();
  /**
   * Property domainVerified
   * @readonly
   * @description Requests a server DNS check.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly domainVerified: OutputEmitterRef<string> = output();
  /**
   * Property domainRemoved
   * @readonly
   * @description Confirmed domain removal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly domainRemoved: OutputEmitterRef<string> = output();
  /**
   * Property retried
   * @readonly
   * @description Requests a fresh policy load.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output();
  /**
   * Property removing
   * @readonly
   * @description Domain selected for removal confirmation.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<OrganizationDomainOutput | null>}
   */
  protected readonly removing: WritableSignal<OrganizationDomainOutput | null> = signal(null);
  /**
   * Property clipboardMessage
   * @readonly
   * @description Live region feedback for copying DNS values.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly clipboardMessage: WritableSignal<string> = signal('');
  /**
   * Property statusLabels
   * @readonly
   * @description Localized domain lifecycle labels.
   * @access protected
   * @since 1.0.0
   * @type {Readonly<Record<OrganizationDomainOutput['status'], string>>}
   */
  protected readonly statusLabels: Readonly<Record<OrganizationDomainOutput['status'], string>> = {
    pending: $localize`:@@org.access.domainStatus.pending:Awaiting verification`,
    verified: $localize`:@@org.access.domainStatus.verified:Verified`,
    suspended: $localize`:@@org.access.domainStatus.suspended:Verification suspended`,
  };
  /**
   * Property hasSuspendedDomain
   * @readonly
   * @description Shows the suspension consequence when a proof has failed.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasSuspendedDomain: Signal<boolean> = computed(
    () => this.policy()?.domains.some((domain) => domain.status === 'suspended') ?? false,
  );
  /**
   * Method copied
   * @method copied
   * @description Reports clipboard completion without exposing unrelated document data.
   * @access protected
   * @since 1.0.0
   * @param {boolean} success - Clipboard result.
   * @returns {void}
   */
  protected copied(success: boolean): void {
    this.clipboardMessage.set(
      success
        ? $localize`:@@org.access.copied:Copied to clipboard.`
        : $localize`:@@org.access.copyFailed:Could not copy. Select and copy the DNS value manually.`,
    );
  }
  /**
   * Method remove
   * @method remove
   * @description Emits removal only after an explicit confirmation.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected remove(): void {
    const domain = this.removing();
    if (domain && !this.pending()) {
      this.domainRemoved.emit(domain.id);
      this.removing.set(null);
    }
  }
}
