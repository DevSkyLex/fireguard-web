import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePipe, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { ActiveFacilityStore, FacilityStore, facilityStoreEvents } from '@core/stores/facility';
import type { FacilityOutput, MoveFacilityInput } from '@core/models/facility';
import { FacilityEquipmentTab } from '@features/organization/facilities/components/facility-equipment-tab';

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
    CardModule,
    DialogModule,
    DividerModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TabsModule,
    FacilityEquipmentTab,
  ],
  providers: [FacilityStore],
  templateUrl: './facility-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailPage {
  //#region Properties
  private readonly router: Router =
    inject<Router>(Router);

  private readonly route: ActivatedRoute =
    inject<ActivatedRoute>(ActivatedRoute);

  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

  private readonly events: Events =
    inject<Events>(Events);

  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  protected readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  protected readonly store: FacilityStore =
    inject<FacilityStore>(FacilityStore);

  protected readonly facility: Signal<FacilityOutput | null> =
    computed<FacilityOutput | null>(() => this.activeFacilityStore.selectedFacility());

  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.activeFacilityStore.isLoadingFacility());

  protected readonly activeTab: WritableSignal<number> =
    signal<number>(0);

  protected readonly showMoveDialog: WritableSignal<boolean> =
    signal<boolean>(false);

  protected readonly moveParentId: WritableSignal<string> =
    signal<string>('');

  protected readonly isMoving: Signal<boolean> =
    computed<boolean>(() => this.store.moveOperation().status === 'loading');

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

  protected readonly facilityTypeIcons: Record<string, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };
  //#endregion

  //#region Constructor
  public constructor() {
    // Load facilities for move dialog parent selection
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadFacilities({ organizationId, options: { itemsPerPage: 200 } });
    }

    // Close dialog on successful move
    effect(() => {
      const operation = this.store.moveOperation();
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
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected onOpenMoveDialog(): void {
    const currentParentId: string = this.facility()?.parentFacilityId ?? '';
    this.moveParentId.set(currentParentId);
    this.showMoveDialog.set(true);
  }

  protected onMoveSubmit(): void {
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    const facilityId: string | undefined = this.facility()?.id;
    if (!organizationId || !facilityId) return;

    const input: MoveFacilityInput = {
      parentFacilityId: this.moveParentId() || null,
    };

    this.store.move({ organizationId, facilityId, input });
  }

  protected onMoveCancel(): void {
    this.showMoveDialog.set(false);
  }
  //#endregion
}
