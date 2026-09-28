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
import {
  lucideChevronDown,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucideCopy,
} from '@ng-icons/lucide';
import type {
  OrganizationAccessPolicyInput,
  OrganizationAccessPolicyOutput,
  OrganizationDomainOutput,
} from '@features/organization/models';
import { OrganizationAccessPolicyForm } from '@features/organization/ui/forms/organization-access-policy-form';
import { OrganizationDomainForm } from '@features/organization/ui/forms/organization-domain-form';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { HlmH4, HlmMuted } from '@shared/ui/typography';

/**
 * Interface OrganizationDomainStatusDescriptor
 *
 * @description
 * How one domain `status` reads on its badge: `label` and `icon` always
 * render, so the state is legible without colour; `iconClass` only tints the
 * icon (WCAG 1.4.1). `checkActionLabel` names the recheck button so the
 * template never branches on the status value itself.
 *
 * @since 1.1.0
 */
interface OrganizationDomainStatusDescriptor {
  readonly label: string;
  readonly icon: string;
  readonly iconClass: string;
  readonly checkActionLabel: string;
}

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
    ...HlmAlertDialogImports,
    ...HlmAlertImports,
    ...HlmCollapsibleImports,
    ...HlmItemImports,
    ...HlmTooltipImports,
    HlmBadge,
    HlmButton,
    HlmEmptyImports,
    HlmH4,
    HlmMuted,
    HlmSkeleton,
    ResourceIllustration,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideClock,
      lucideCopy,
    }),
  ],
  templateUrl: './organization-access-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAccessPanel {
  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

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

  /** Pure, dependency-free date formatter for {@link checkStatusLineOf} — no DI needed for a single-instance internal use. */
  private readonly orgDatePipe: OrgDatePipe = new OrgDatePipe();
  /**
   * Property statusDescriptors
   * @readonly
   * @description Every domain status's localized label, icon and severity class — pairing colour with a label and glyph so a domain's verification state is never conveyed by colour alone.
   * @access protected
   * @since 1.1.0
   * @type {Readonly<Record<OrganizationDomainOutput['status'], OrganizationDomainStatusDescriptor>>}
   */
  protected readonly statusDescriptors: Readonly<
    Record<OrganizationDomainOutput['status'], OrganizationDomainStatusDescriptor>
  > = {
    pending: {
      label: $localize`:@@org.access.domainStatus.pending:Awaiting verification`,
      icon: 'lucideClock',
      iconClass: 'text-muted-foreground',
      checkActionLabel: $localize`:@@org.access.verifyDomain:Verify domain`,
    },
    verified: {
      label: $localize`:@@org.access.domainStatus.verified:Verified`,
      icon: 'lucideCircleCheck',
      iconClass: 'text-success',
      checkActionLabel: $localize`:@@org.access.recheckDomain:Check again`,
    },
    suspended: {
      label: $localize`:@@org.access.domainStatus.suspended:Verification suspended`,
      icon: 'lucideCircleAlert',
      iconClass: 'text-warning',
      checkActionLabel: $localize`:@@org.access.verifyDomain:Verify domain`,
    },
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
   * Property dnsExpandedOverrides
   * @readonly
   * @description Per-domain manual overrides of the DNS-record disclosure, keyed by domain id. Absent domains fall back to {@link isDnsExpanded}'s default (collapsed once verified).
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<ReadonlyMap<string, boolean>>}
   */
  protected readonly dnsExpandedOverrides: WritableSignal<ReadonlyMap<string, boolean>> = signal(
    new Map<string, boolean>(),
  );

  /**
   * Method isDnsExpanded
   * @description Whether a domain's DNS instructions disclosure is open — a manual override if the operator toggled it this session, otherwise open for anything not yet verified and closed for a verified domain.
   * @access protected
   * @since 1.1.0
   * @param {OrganizationDomainOutput} domain - The domain row.
   * @returns {boolean} Whether the disclosure is open.
   */
  protected isDnsExpanded(domain: OrganizationDomainOutput): boolean {
    return this.dnsExpandedOverrides().get(domain.id) ?? domain.status !== 'verified';
  }

  /**
   * Method setDnsExpanded
   * @description Records a manual toggle of a domain's DNS instructions disclosure.
   * @access protected
   * @since 1.1.0
   * @param {string} domainId - The toggled domain's id.
   * @param {boolean} expanded - The disclosure's next state.
   * @returns {void}
   */
  protected setDnsExpanded(domainId: string, expanded: boolean): void {
    const next: Map<string, boolean> = new Map(this.dnsExpandedOverrides());
    next.set(domainId, expanded);
    this.dnsExpandedOverrides.set(next);
  }

  /** Localized label for the "Copy TXT record name" icon-only button, reused by its `hlmTooltip`. */
  protected readonly copyNameLabel: string = $localize`:@@org.access.copyName:Copy TXT record name`;

  /** Localized label for the "Copy TXT record value" icon-only button, reused by its `hlmTooltip`. */
  protected readonly copyValueLabel: string = $localize`:@@org.access.copyValue:Copy TXT record value`;

  /**
   * Method checkStatusLineOf
   *
   * @description
   * The muted line under a domain's title, naming when it was last found
   * verified or, for a domain that never has been, when it was last checked
   * at all — so a stale check is legible without opening the DNS details.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {OrganizationDomainOutput} domain - The domain row.
   *
   * @returns {string | null} The localized line, or `null` when neither timestamp is set.
   */
  protected checkStatusLineOf(domain: OrganizationDomainOutput): string | null {
    const settings: RegionalFormatSettings = this.regionalFormatting();

    if (domain.verifiedAt) {
      const date: string = this.orgDatePipe.transform(domain.verifiedAt, 'date', settings);
      return $localize`:@@org.access.verifiedOn:Verified ${date}:date:`;
    }
    if (domain.lastCheckedAt) {
      const date: string = this.orgDatePipe.transform(domain.lastCheckedAt, 'datetime', settings);
      return $localize`:@@org.access.lastCheckedOn:Last checked ${date}:date:`;
    }

    return null;
  }

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
