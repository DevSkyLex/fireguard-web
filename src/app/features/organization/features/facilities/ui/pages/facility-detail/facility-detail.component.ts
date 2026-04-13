import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePipe, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { ActiveOrganizationStore } from '@features/organization/state';
import { ActiveFacilityStore, FacilityStore, facilityStoreEvents } from '@features/organization/features/facilities/state';
import type { FacilityOutput, MoveFacilityInput } from '@features/organization/features/facilities/models';
import { FacilityEquipmentTab, FacilityInspectionTab } from '@features/organization/features/facilities/ui/components';

/**
 * Component FacilityDetailPage
 * @class FacilityDetailPage
 *
 * @description
 * Facility detail page displaying facility information and
 * tabbed sub-content (Overview, Equipments, Inspections).
 * The facility is resolved by {@link facilityResolver} before
 * this component renders.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-detail',
  imports: [
    RouterModule,
    DatePipe,
    FormsModule,
    KeyValuePipe,
    TitleCasePipe,
    AvatarModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TabsModule,
    FacilityEquipmentTab,
    FacilityInspectionTab,
  ],
  providers: [FacilityStore],
  templateUrl: './facility-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailPage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to the edit page and
   * after successful operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used as a navigation anchor for
   * relative routing.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute =
    inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG toast service used to display success and error
   * notifications after store operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx Signals event bus used to subscribe to store-level
   * failure events (e.g. move failed).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events =
    inject<Events>(Events);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-scoped store providing the current organization context.
   * Used to obtain the `organizationId` required by all API calls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property activeFacilityStore
   * @readonly
   *
   * @description
   * Root-scoped store that holds the currently resolved facility.
   * Populated by the route resolver before this component renders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveFacilityStore}
   */
  protected readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped FacilityStore used for write operations
   * (move, archive) and loading the parent options for the
   * move dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore =
    inject<FacilityStore>(FacilityStore);

  /**
   * Property facility
   * @readonly
   *
   * @description
   * The currently resolved facility proxied from
   * {@link ActiveFacilityStore}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FacilityOutput | null>}
   */
  protected readonly facility: Signal<FacilityOutput | null> =
    computed<FacilityOutput | null>(() => this.activeFacilityStore.selectedFacility());

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the active facility is currently being resolved.
   * Used to show skeleton placeholders in the header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.activeFacilityStore.isLoadingFacility());

  /**
   * Property activeTab
   *
   * @description
   * Index of the currently active tab panel (0=Overview,
   * 1=Equipments, 2=Inspections). Writable so the template can
   * update it via `(valueChange)`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly activeTab: WritableSignal<number> =
    signal<number>(0);

  /**
   * Property showMoveDialog
   *
   * @description
   * Controls the visibility of the Move Facility dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly showMoveDialog: WritableSignal<boolean> =
    signal<boolean>(false);

  /**
   * Property moveParentId
   *
   * @description
   * The parent facility ID selected in the move dialog. An empty
   * string represents the root level (no parent).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly moveParentId: WritableSignal<string> =
    signal<string>('');

  /**
   * Property isMoving
   * @readonly
   *
   * @description
   * Whether a move operation is currently in-flight. Used to
   * disable buttons and show a loading indicator in the dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMoving: Signal<boolean> =
    computed<boolean>(() => this.store.moveCallState().status === 'pending');

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Computed select options for the move-dialog parent picker.
   * Includes a "None (root level)" sentinel and all facilities
   * except the current one to avoid circular parenting.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: string }[]>}
   */
  protected readonly parentOptions: Signal<{ label: string; value: string }[]> =
    computed<{ label: string; value: string }[]>(() => {
      const currentId: string | undefined = this.facility()?.id;
      const facilities: readonly FacilityOutput[] = this.store.facilities();
      const options: { label: string; value: string }[] = [
        { label: 'None (root level)', value: '' },
      ];
      for (const f of facilities) {
        if (f.id !== currentId) {
          options.push({
            label: `${f.name}${f.code ? ' (' + f.code + ')' : ''}`,
            value: f.id,
          });
        }
      }
      return options;
    });

  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * Maps facility types to PrimeNG icon classes for use in
   * avatar icons and tags throughout the template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<string, string>}
   */
  protected readonly facilityTypeIcons: Record<string, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Pre-loads all organization facilities (for the move-dialog parent
   * picker), then sets up an effect to close the dialog and toast on
   * successful move, and subscribes to the move-failed event for the
   * error toast.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    // Load facilities for move dialog parent selection
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadFacilities({ organizationId, options: { itemsPerPage: 200 } });
    }

    // Close dialog on successful move
    effect(() => {
      const operation = this.store.moveCallState();
      if (operation.status === 'success' && operation.data) {
        this.showMoveDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Facility moved',
          detail: `"${operation.data.name}" has been moved successfully.`,
          life: 4000,
        });
      }
    });

    // Error toast on move failure
    this.events
      .on(facilityStoreEvents.moveFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
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
   * Method onEdit
   * @method onEdit
   *
   * @description
   * Navigates to the facility edit page relative to the current route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  /**
   * Method onOpenMoveDialog
   * @method onOpenMoveDialog
   *
   * @description
   * Pre-selects the current parent facility in the picker, then
   * opens the Move Facility dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onOpenMoveDialog(): void {
    const currentParentId: string = this.facility()?.parentFacilityId ?? '';
    this.moveParentId.set(currentParentId);
    this.showMoveDialog.set(true);
  }

  /**
   * Method onMoveSubmit
   * @method onMoveSubmit
   *
   * @description
   * Reads the selected parent facility ID from the dialog and
   * dispatches a move operation to the store. A null value means
   * the facility is moved to the root level.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onMoveSubmit(): void {
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    const facilityId: string | undefined = this.facility()?.id;
    if (!organizationId || !facilityId) return;

    const input: MoveFacilityInput = {
      parentFacilityId: this.moveParentId() || null,
    };

    this.store.move({ organizationId, facilityId, input });
  }

  /**
   * Method onMoveCancel
   * @method onMoveCancel
   *
   * @description
   * Closes the Move Facility dialog without performing an action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onMoveCancel(): void {
    this.showMoveDialog.set(false);
  }
  //#endregion
}

