import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import {
  EquipmentStore,
  equipmentStoreEvents,
} from '@features/organization/features/equipments/state';
import {
  EquipmentForm,
  type EquipmentFormValues,
} from '@features/organization/features/equipments/ui/forms';
import { ORGANIZATION_QUOTA_RESOURCE } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationQuotaUpgradeDialog } from '@features/organization/ui/components';
import { isQuotaExceededError } from '@features/organization/utils';

/**
 * Component EquipmentCreatePage
 * @class EquipmentCreatePage
 *
 * @description
 * Page for creating a new equipment within the current organization.
 * Hosts the {@link EquipmentForm} in create mode, handles store
 * interaction, error toasts and navigation on success.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-create',
  imports: [EquipmentForm, OrganizationQuotaUpgradeDialog],
  providers: [EquipmentStore],
  templateUrl: './equipment-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCreatePage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property messageService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /**
   * Property quotaStore
   * @readonly
   *
   * @description
   * Root-provided quota store, reloaded after a quota-exceeded failure so the
   * usage meters stay in sync.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationQuotaStore}
   */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** The capped resource governing equipment creation. */
  protected readonly quotaResource = ORGANIZATION_QUOTA_RESOURCE.EQUIPMENT;

  /** Visibility of the quota upgrade dialog shown on a 409 failure. */
  protected readonly quotaDialogVisible: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Subscribes to store events for error toasts and watches
   * createOperation success for navigation.
   *
   * @since 1.0.0
   */
  public constructor() {
    // Navigate to the equipment list on successful creation
    effect(() => {
      const operation = this.store.createCallState();
      if (operation.status === 'success' && operation.data) {
        this.messageService.add({
          severity: 'success',
          summary: 'Equipment created',
          detail: `Equipment "${operation.data.type}" has been created successfully.`,
          life: 4000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });

    // Error feedback on create failure: route quota (409) failures to the
    // actionable upgrade dialog, everything else to a generic error toast.
    this.events
      .on(equipmentStoreEvents.createFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (isQuotaExceededError(payload)) {
          this.quotaStore.reload();
          this.quotaDialogVisible.set(true);
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleSubmit
   * @method handleSubmit
   *
   * @description
   * Converts form values to a {@link CreateEquipmentInput} and
   * dispatches a create action to the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentFormValues} values - The submitted form values.
   *
   * @returns {void}
   */
  protected handleSubmit(values: EquipmentFormValues): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;

    const input: CreateEquipmentInput = {
      type: values.type,
      ...(values.subType ? { subType: values.subType } : {}),
      ...(values.brand ? { brand: values.brand } : {}),
      ...(values.model ? { model: values.model } : {}),
      ...(values.serialNumber ? { serialNumber: values.serialNumber } : {}),
      ...(values.locationLabel ? { locationLabel: values.locationLabel } : {}),
    };

    this.store.create({ organizationId, input });
  }

  /**
   * Method handleCancel
   * @method handleCancel
   *
   * @description
   * Navigates back to the equipment list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleCancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
  //#endregion
}
