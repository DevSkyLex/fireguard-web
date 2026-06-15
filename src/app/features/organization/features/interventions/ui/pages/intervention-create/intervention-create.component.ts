import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionPriority,
  InterventionType,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component InterventionCreatePage
 * @class InterventionCreatePage
 *
 * @description
 * Orchestrates the intervention create page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-page',
  imports: [ButtonModule, FormsModule, InputTextModule, MultiSelectModule, SelectModule],
  providers: [InterventionPlanningOptionsStore],
  templateUrl: './intervention-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreatePage {
  protected readonly planningOptions: InterventionPlanningOptionsStoreType = inject(
    InterventionPlanningOptionsStore,
  );

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the name value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly name: WritableSignal<string> = signal('');

  /**
   * Property type
   * @readonly
   *
   * @description
   * Provides the type value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionType>}
   */
  protected readonly type: WritableSignal<InterventionType> = signal<InterventionType>('site_setup');

  /**
   * Property site
   * @readonly
   *
   * @description
   * Provides the site value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly site: WritableSignal<string> = signal('');

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Provides the responsible value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly responsible: WritableSignal<string> = signal('');

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Provides the participants value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  protected readonly participants: WritableSignal<readonly string[]> = signal<readonly string[]>(
    [],
  );

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Provides the priority value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionPriority>}
   */
  protected readonly priority: WritableSignal<InterventionPriority> = signal<InterventionPriority>('normal');

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Provides the planned start at value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly plannedStartAt: WritableSignal<string> = signal('');

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Provides the due at value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly dueAt: WritableSignal<string> = signal('');

  /**
   * Property referencePack
   * @readonly
   *
   * @description
   * Selected reference pack IRI. Empty lets the server apply the default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly referencePack: WritableSignal<string> = signal('');

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Provides the creating value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly creating: WritableSignal<boolean> = signal(false);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Provides the site options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
   */
  protected readonly siteOptions = this.planningOptions.sites;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Provides the member options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
   */
  protected readonly memberOptions = this.planningOptions.members;

  /**
   * Property referencePackOptions
   * @readonly
   *
   * @description
   * Available regulatory reference packs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly { label: string; value: string }[]>}
   */
  protected readonly referencePackOptions = this.planningOptions.referencePacks;

  /**
   * Property priorityOptions
   * @readonly
   *
   * @description
   * Provides the priority options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof priorityOptions}
   */
  protected readonly priorityOptions: SelectOption<InterventionPriority>[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  /**
   * Property interventionTypes
   * @readonly
   *
   * @description
   * Provides the intervention types value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly {
   * value: InterventionType;
   * label: string;
   * description: string;
   * icon: string;
   * }[]}
   */
  protected readonly interventionTypes: readonly {
    value: InterventionType;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: 'site_setup',
      label: 'Site setup',
      description: 'Declare or enrich a site and its hierarchy.',
      icon: 'pi pi-sitemap',
    },
    {
      value: 'inventory',
      label: 'Inventory',
      description: 'Verify and complete equipment inventory.',
      icon: 'pi pi-box',
    },
    {
      value: 'inspection_campaign',
      label: 'Inspection campaign',
      description: 'Execute a prepared inspection campaign.',
      icon: 'pi pi-clipboard',
    },
  ];

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Provides the organization value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Provides the interventions value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionService}
   */
  private readonly interventions: InterventionService = inject(InterventionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Provides the router value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the class dependencies and reactive behavior.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      this.planningOptions.loadCreationOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Executes the create operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the create operation.
   */
  protected create(): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId || !this.name().trim()) return;
    this.creating.set(true);
    this.interventions
      .create(organizationId, this.name().trim(), {
        type: this.type(),
        priority: this.priority(),
        participants: this.participants(),
        ...(this.site() ? { site: this.site() } : {}),
        ...(this.responsible() ? { responsible: this.responsible() } : {}),
        ...(this.plannedStartAt()
          ? { plannedStartAt: new Date(this.plannedStartAt()).toISOString() }
          : {}),
        ...(this.dueAt() ? { dueAt: new Date(this.dueAt()).toISOString() } : {}),
        ...(this.referencePack() ? { referencePack: this.referencePack() } : {}),
      })
      .subscribe({
        next: (intervention) =>
          void this.router.navigate(['/organizations', organizationId, 'interventions', intervention.id]),
        error: () => this.creating.set(false),
      });
  }
}
