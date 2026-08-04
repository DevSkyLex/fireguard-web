import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  type Signal,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Popover } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationOutput } from '@features/organization/models';
import { ORGANIZATION_NAVIGATION_ITEMS } from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { deriveInitials } from '@shared/initials';
import type { OrganizationSwitcherOption } from './models';

/**
 * Component OrganizationSwitcher
 * @class OrganizationSwitcher
 *
 * @description
 * The workspace sidebar's header: the active organization, and a popover to
 * switch to another or create one. Replaces the 60px organization rail, which
 * existed only on desktop and left the switch unreachable on a phone.
 *
 * Feature-owned rather than layout-owned because it reads organization state —
 * the layout only provides the column (ARCHITECTURE.md §2.7).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-switcher />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher',
  imports: [Popover, SkeletonModule],
  // `OrganizationStore` is component-scoped by design (no `providedIn: 'root'`),
  // so each consumer owns an instance tied to its own lifecycle.
  providers: [OrganizationStore],
  templateUrl: './organization-switcher.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcher implements OnInit {
  //#region Properties
  /** Component-scoped list of the organizations the member belongs to. */
  private readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /** Router used to switch organizations and to reach organization creation. */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Routed organization. Read through the port rather than the
   * component-scoped list store, whose own selection would not follow the route.
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** The popover instance, closed programmatically once a switch is dispatched. */
  private readonly popover: Signal<Popover | undefined> = viewChild<Popover>('popover');

  /** Whether the organization list is still loading. */
  protected readonly loading: Signal<boolean> = computed((): boolean =>
    this.organizationStore.isLoadingOrganizations(),
  );

  /** One option per organization, in list order. */
  protected readonly options: Signal<readonly OrganizationSwitcherOption[]> = computed(
    (): readonly OrganizationSwitcherOption[] => {
      const activeId: string | null = this.organizationContext.selectedOrganizationId();

      return this.organizationStore
        .organizations()
        .map((organization: OrganizationOutput): OrganizationSwitcherOption => {
          // API Platform omits null fields, so `logoUrl` arrives `undefined`
          // rather than null — a `=== null` guard would let it through.
          const logoUrl: string | null = organization.logoUrl ?? null;

          return {
            id: organization.id,
            name: organization.name,
            initials: deriveInitials(organization.name),
            logoUrl,
            active: organization.id === activeId,
          };
        });
    },
  );

  /** The organization currently open, or `null` before the route resolves. */
  protected readonly active: Signal<OrganizationSwitcherOption | null> = computed(
    (): OrganizationSwitcherOption | null => {
      const organization = this.organizationContext.selectedOrganization();

      if (!organization) return null;

      return {
        id: organization.id,
        name: organization.name,
        initials: deriveInitials(organization.name),
        logoUrl: organization.logoUrl ?? null,
        active: true,
      };
    },
  );

  /** Whether more than one organization is reachable, so switching is offered. */
  protected readonly canSwitch: Signal<boolean> = computed(
    (): boolean => this.options().length > 1,
  );

  /** Tracks the popover's open state so the trigger can expose `aria-expanded`. */
  protected readonly expanded: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   *
   * @description
   * Loads the organization list when nothing has fetched it yet — a member
   * landing directly on a workspace URL has no other trigger.
   *
   * @access public
   * @returns {void}
   */
  public ngOnInit(): void {
    if (this.organizationStore.organizations().length > 0) return;
    if (this.organizationStore.isLoadingOrganizations()) return;

    this.organizationStore.loadOrganizations();
  }
  //#endregion

  //#region Methods
  /**
   * Method select
   *
   * @description
   * Switches the workspace to another organization, keeping the current
   * section when that section exists in every organization. Only the first
   * segment is carried over: a deeper path names an entity that belongs to the
   * organization being left.
   *
   * @access protected
   * @param {OrganizationSwitcherOption} option - Organization the member picked.
   * @returns {void}
   */
  protected select(option: OrganizationSwitcherOption): void {
    this.close();

    if (option.active) return;

    void this.router.navigate(['/organizations', option.id, ...this.portableSection()]);
  }

  /**
   * Method createOrganization
   *
   * @description
   * Sends the member to the guided organization setup.
   *
   * @access protected
   * @returns {void}
   */
  protected createOrganization(): void {
    this.close();
    void this.router.navigate(['/onboarding']);
  }

  /**
   * Method onToggle
   *
   * @description
   * Mirrors the popover's visibility into {@link expanded}.
   *
   * @access protected
   * @param {boolean} open - Whether the popover is now shown.
   * @returns {void}
   */
  protected onToggle(open: boolean): void {
    this.expanded.set(open);
  }

  /**
   * Returns the current section as a route fragment when it is one every
   * organization has, and an empty fragment otherwise (which lands on the
   * organization's own landing route).
   */
  private portableSection(): readonly string[] {
    const segments: readonly string[] = this.router.url
      .split('?')[0]
      .split('/')
      .filter((segment: string): boolean => segment.length > 0);

    // ['organizations', '<id>', '<section>', …]
    const section: string | undefined = segments[2];

    if (!section) return [];

    const isSharedSection: boolean = ORGANIZATION_NAVIGATION_ITEMS.some(
      (item): boolean => item.path === section,
    );

    return isSharedSection ? [section] : [];
  }

  /** Hides the popover, when one is open. */
  private close(): void {
    this.popover()?.hide();
    this.expanded.set(false);
  }
  //#endregion
}
