import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import type { CreateMissionChangeInput } from '../mission-change/create-mission-change-input.interface';
import type { UpdateMissionChangeInput } from '../mission-change/update-mission-change-input.interface';
import type { CreateMissionWorkItemInput } from '../mission-work-item/create-mission-work-item-input.interface';
import type { UpdateMissionWorkItemInput } from '../mission-work-item/update-mission-work-item-input.interface';
import type { MissionOutput } from '../mission/mission-output.interface';
import type { MissionStatus } from '../mission/mission-status.type';

/**
 * Associates every queued operation with its persisted payload contract.
 */
export interface MissionOutboxPayloadMap {
  readonly 'facility.create': CreateFacilityInput;
  readonly 'equipment.create': CreateEquipmentInput;
  readonly 'inspection.create': CreateInspectionInput;
  readonly 'media.create': {
    readonly clientId?: string;
    readonly equipmentId: string;
    readonly file: Blob;
    readonly fileName: string;
  };
  readonly 'mission.update': Partial<{
    readonly clientId: string;
    readonly revision: number;
    readonly name: string;
    readonly status: MissionStatus;
    readonly site: string | null;
    readonly responsible: string | null;
    readonly participants: readonly string[];
    readonly priority: MissionOutput['priority'];
    readonly plannedStartAt: string | null;
    readonly dueAt: string | null;
    readonly referencePack: string;
    readonly reviewNote: string | null;
  }>;
  readonly 'work-item.create': CreateMissionWorkItemInput;
  readonly 'work-item.update': UpdateMissionWorkItemInput & {
    readonly clientId?: string;
    readonly workItemId: string;
    readonly revision?: number;
  };
  readonly 'change.create': CreateMissionChangeInput;
  readonly 'change.update': UpdateMissionChangeInput & {
    readonly clientId?: string;
    readonly changeId: string;
    readonly revision?: number;
  };
}
