import { ScrollingModule } from '@angular/cdk/scrolling';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input as routeInput,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { firstValueFrom, forkJoin, fromEvent, merge, type Observable } from 'rxjs';
import type {
  CreateEquipmentInput,
  EquipmentOutput,
} from '@features/organization/features/equipments/models';
import type {
  CreateFacilityInput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import type {
  CreateInspectionInput,
  InspectionOutput,
} from '@features/organization/features/inspections/models';
import { MissionService } from '@features/organization/features/missions/data-access';
import type {
  MissionIssueOutput,
  MissionOutput,
  MissionSnapshot,
  PublicationOutput,
} from '@features/organization/features/missions/models';
import {
  MissionOfflineService,
  type MissionOutboxOperation,
  type MissionOutboxType,
} from '@features/organization/features/missions/services';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Interface SelectOption
 *
 * @description
 * Generic select option contract used by mission forms.
 */
interface SelectOption<T extends string = string> {
  readonly label: string;
  readonly value: T;
}

/**
 * Component MissionDetailPage
 *
 * @description
 * Route entry page orchestrating the end-to-end field mission workflow.
 *
 * Responsibilities include:
 * - loading mission and related entities,
 * - managing create flows (facilities, equipment, inspections),
 * - handling offline queueing and replay,
 * - publishing mission readiness,
 * - handling compressed evidence uploads.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-mission-detail-page',
  imports: [
    ButtonModule,
    CardModule,
    InputTextModule,
    ProgressBarModule,
    ReactiveFormsModule,
    ScrollingModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './mission-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionDetailPage {
  public readonly missionId = routeInput.required<string>();

  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly service: MissionService = inject(MissionService);
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);
  private readonly organization: ActiveOrganizationStore = inject(ActiveOrganizationStore);
  private readonly messages: MessageService = inject(MessageService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly mission = signal<MissionOutput | null>(null);
  protected readonly issues = signal<readonly MissionIssueOutput[]>([]);
  protected readonly facilities = signal<readonly FacilityOutput[]>([]);
  protected readonly equipment = signal<readonly EquipmentOutput[]>([]);
  protected readonly inspections = signal<readonly InspectionOutput[]>([]);
  protected readonly loading = signal(true);
  protected readonly syncing = signal(false);
  protected readonly publishing = signal(false);
  protected readonly uploadingPhoto = signal(false);
  protected readonly online = signal(this.browser ? navigator.onLine : true);
  protected readonly pendingCount = signal(0);
  protected readonly restoredOffline = signal(false);

  protected readonly blockerCount = computed(
    (): number => this.issues().filter((issue) => issue.severity === 'blocker').length,
  );
  protected readonly progress = computed((): number => {
    let completed = 1;
    if (this.facilities().length > 0) completed++;
    if (this.equipment().length > 0) completed++;
    if (this.inspections().length > 0) completed++;
    if (this.blockerCount() === 0 && this.equipment().length > 0) completed++;
    if (this.mission()?.status === 'published') completed++;
    return Math.round((completed / 6) * 100);
  });
  protected readonly canPublish = computed(
    (): boolean =>
      this.online() &&
      this.blockerCount() === 0 &&
      this.pendingCount() === 0 &&
      this.mission()?.status === 'draft' &&
      !this.publishing(),
  );
  protected readonly facilityOptions = computed((): SelectOption[] =>
    this.facilities().map((facility) => ({ label: facility.name, value: facility.id })),
  );
  protected readonly equipmentOptions = computed((): SelectOption[] =>
    this.equipment().map((item) => ({
      label: `${item.type}${item.serialNumber ? ` - ${item.serialNumber}` : ''}`,
      value: item.id,
    })),
  );

  protected readonly facilityTypes: SelectOption[] = [
    { label: 'Site', value: 'site' },
    { label: 'Building', value: 'building' },
    { label: 'Floor', value: 'floor' },
    { label: 'Zone', value: 'zone' },
    { label: 'Area', value: 'area' },
  ];
  protected readonly inspectionResults: SelectOption[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

  protected readonly facilityForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<CreateFacilityInput['type']>('building', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  protected readonly equipmentForm = new FormGroup({
    type: new FormControl('fire_extinguisher', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    facilityId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    serialNumber: new FormControl('', { nonNullable: true }),
    locationLabel: new FormControl('', { nonNullable: true }),
  });
  protected readonly inspectionForm = new FormGroup({
    equipmentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    result: new FormControl<CreateInspectionInput['result']>('pass', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    inspectorName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl('', { nonNullable: true }),
  });
  protected readonly photoEquipmentId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  public constructor() {
    if (this.browser) {
      merge(fromEvent(window, 'online'), fromEvent(window, 'offline'))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((): void => {
          this.online.set(navigator.onLine);
          if (navigator.onLine) void this.sync();
        });
    }

    effect((): void => {
      const organizationId: string | undefined = this.organization.selectedOrganization()?.id;
      const missionId: string = this.missionId();

      if (organizationId) {
        void this.load(organizationId, missionId);
      }
    });
  }

  protected async createFacility(): Promise<void> {
    if (this.facilityForm.invalid) return;
    const input: CreateFacilityInput = this.facilityForm.getRawValue();
    await this.createOrQueue('facility.create', input, () =>
      this.service.createFacility(this.organizationId(), this.missionId(), input),
    );
    this.facilityForm.controls.name.reset('');
  }

  protected async createEquipment(): Promise<void> {
    if (this.equipmentForm.invalid) return;
    const values = this.equipmentForm.getRawValue();
    const input: CreateEquipmentInput = {
      type: values.type,
      facility: `/api/facilities/${values.facilityId}`,
      serialNumber: values.serialNumber || undefined,
      locationLabel: values.locationLabel || undefined,
    };
    await this.createOrQueue('equipment.create', input, () =>
      this.service.createEquipment(this.organizationId(), this.missionId(), input),
    );
    this.equipmentForm.controls.serialNumber.reset('');
  }

  protected async createInspection(): Promise<void> {
    if (this.inspectionForm.invalid) return;
    const values = this.inspectionForm.getRawValue();
    const item: EquipmentOutput | undefined = this.equipment().find(
      (equipment) => equipment.id === values.equipmentId,
    );
    const input: CreateInspectionInput = {
      equipmentId: values.equipmentId,
      facilityId: item?.facilityId,
      result: values.result,
      performedAt: new Date().toISOString(),
      inspectorType: 'external',
      inspectorName: values.inspectorName,
      notes: values.notes || undefined,
    };
    await this.createOrQueue('inspection.create', input, () =>
      this.service.createInspection(this.organizationId(), this.missionId(), input),
    );
    this.inspectionForm.controls.notes.reset('');
  }

  protected async sync(): Promise<void> {
    if (!this.online() || this.syncing()) return;
    this.syncing.set(true);
    try {
      const operations: readonly MissionOutboxOperation[] = await this.offline.listOutbox(
        this.missionId(),
      );
      await this.replayOperations(operations);
      await this.load(this.organizationId(), this.missionId(), false);
      if (operations.length > 0) {
        this.messages.add({
          severity: 'success',
          summary: `${operations.length} offline changes synchronized`,
        });
      }
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Synchronization stopped',
        detail: 'One operation could not be sent.',
      });
    } finally {
      this.syncing.set(false);
      await this.refreshPendingCount();
    }
  }

  protected async publish(): Promise<void> {
    const mission: MissionOutput | null = this.mission();
    if (!mission || !this.canPublish()) return;
    this.publishing.set(true);
    try {
      const publication: PublicationOutput = await firstValueFrom(this.service.publish(mission));
      this.messages.add({
        severity: publication.status === 'failed' ? 'error' : 'success',
        summary: publication.status === 'failed' ? 'Publication failed' : 'Mission published',
        detail: publication.error ?? undefined,
      });
      await this.load(this.organizationId(), this.missionId(), false);
    } catch {
      this.messages.add({ severity: 'error', summary: 'Publication failed' });
    } finally {
      this.publishing.set(false);
    }
  }

  protected async uploadPhoto(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file: File | undefined = inputElement.files?.[0];
    if (!file || this.photoEquipmentId.invalid) return;
    this.uploadingPhoto.set(true);
    try {
      const compressed: File = await this.compressPhoto(file);
      const payload = {
        equipmentId: this.photoEquipmentId.value,
        file: compressed,
        fileName: compressed.name,
      };
      if (!this.online()) {
        await this.offline.queue(this.missionId(), 'media.create', payload);
        await this.refreshPendingCount();
        this.messages.add({ severity: 'info', summary: 'Photo saved offline' });
      } else {
        await firstValueFrom(
          this.service.uploadMedia(payload.equipmentId, payload.file, payload.fileName),
        );
        this.messages.add({ severity: 'success', summary: 'Photo uploaded' });
      }
    } catch {
      this.messages.add({ severity: 'error', summary: 'Photo upload failed' });
    } finally {
      this.uploadingPhoto.set(false);
      inputElement.value = '';
    }
  }

  protected async reload(): Promise<void> {
    await this.load(this.organizationId(), this.missionId());
  }

  private async createOrQueue(
    type: MissionOutboxType,
    input: object,
    request: () => Observable<unknown>,
  ): Promise<void> {
    if (!this.online()) {
      await this.offline.queue(this.missionId(), type, input as Readonly<Record<string, unknown>>);
      await this.refreshPendingCount();
      this.messages.add({
        severity: 'info',
        summary: 'Saved offline',
        detail: 'The operation will be sent when the connection returns.',
      });
      return;
    }
    try {
      await firstValueFrom(request());
      await this.load(this.organizationId(), this.missionId(), false);
    } catch {
      this.messages.add({ severity: 'error', summary: 'Creation failed' });
    }
  }

  private async replay(operation: MissionOutboxOperation): Promise<void> {
    const organizationId: string = this.organizationId();
    switch (operation.type) {
      case 'facility.create':
        await firstValueFrom(
          this.service.createFacility(
            organizationId,
            operation.missionId,
            operation.payload as CreateFacilityInput,
          ),
        );
        break;
      case 'equipment.create':
        await firstValueFrom(
          this.service.createEquipment(
            organizationId,
            operation.missionId,
            operation.payload as CreateEquipmentInput,
          ),
        );
        break;
      case 'inspection.create':
        await firstValueFrom(
          this.service.createInspection(
            organizationId,
            operation.missionId,
            operation.payload as unknown as CreateInspectionInput,
          ),
        );
        break;
      case 'media.create': {
        const file = operation.payload['file'];
        const equipmentId = operation.payload['equipmentId'];
        const fileName = operation.payload['fileName'];
        if (
          !(file instanceof Blob) ||
          typeof equipmentId !== 'string' ||
          typeof fileName !== 'string'
        ) {
          throw new Error('Invalid offline media operation');
        }
        await firstValueFrom(this.service.uploadMedia(equipmentId, file, fileName));
        break;
      }
    }
  }

  private async replayOperations(operations: readonly MissionOutboxOperation[]): Promise<void> {
    const [operation, ...remaining] = operations;
    if (!operation) return;
    try {
      await this.replay(operation);
    } catch (error: unknown) {
      if ((error as { status?: number }).status !== 412) throw error;
    }
    await this.offline.removeOutbox(operation.id);
    await this.replayOperations(remaining);
  }

  private async load(organizationId: string, missionId: string, showLoading = true): Promise<void> {
    if (showLoading) this.loading.set(true);
    try {
      const result = await firstValueFrom(
        forkJoin({
          mission: this.service.get(missionId),
          issues: this.service.listIssues(missionId),
          facilities: this.service.listFacilities(organizationId, missionId),
          equipment: this.service.listEquipment(organizationId, missionId),
          inspections: this.service.listInspections(organizationId, missionId),
        }),
      );
      this.applySnapshot({
        mission: result.mission,
        issues: result.issues.member,
        facilities: result.facilities.member,
        equipment: result.equipment.member,
        inspections: result.inspections.member,
        savedAt: new Date().toISOString(),
      });
      this.restoredOffline.set(false);
      await this.offline.saveSnapshot({
        mission: result.mission,
        issues: result.issues.member,
        facilities: result.facilities.member,
        equipment: result.equipment.member,
        inspections: result.inspections.member,
        savedAt: new Date().toISOString(),
      });
    } catch {
      const snapshot: MissionSnapshot | null = await this.offline.getSnapshot(missionId);
      if (snapshot) {
        this.applySnapshot(snapshot);
        this.restoredOffline.set(true);
        this.messages.add({
          severity: 'warn',
          summary: 'Offline mission restored',
          detail: 'Showing the last locally saved version.',
        });
      } else {
        this.messages.add({ severity: 'error', summary: 'Unable to load mission' });
      }
    } finally {
      this.loading.set(false);
      await this.refreshPendingCount();
    }
  }

  private applySnapshot(snapshot: MissionSnapshot): void {
    this.mission.set(snapshot.mission);
    this.issues.set(snapshot.issues);
    this.facilities.set(snapshot.facilities);
    this.equipment.set(snapshot.equipment);
    this.inspections.set(snapshot.inspections);
  }

  private async refreshPendingCount(): Promise<void> {
    this.pendingCount.set((await this.offline.listOutbox(this.missionId())).length);
  }

  private organizationId(): string {
    const id: string | undefined = this.organization.selectedOrganization()?.id;
    if (!id) throw new Error('No active organization');
    return id;
  }

  private async compressPhoto(file: File): Promise<File> {
    if (!this.browser || !file.type.startsWith('image/')) return file;
    const image: ImageBitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!context) {
      image.close();
      return file;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result): void =>
          result ? resolve(result) : reject(new Error('Image compression failed')),
        'image/jpeg',
        0.82,
      );
    });
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  }
}
