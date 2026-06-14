import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import type { CreateInterventionChangeInput } from '../intervention-change/create-intervention-change-input.interface';
import type { UpdateInterventionChangeInput } from '../intervention-change/update-intervention-change-input.interface';
import type { CreateInterventionWorkItemInput } from '../intervention-work-item/create-intervention-work-item-input.interface';
import type { UpdateInterventionWorkItemInput } from '../intervention-work-item/update-intervention-work-item-input.interface';
import type { InterventionOutput } from '../intervention/intervention-output.interface';
import type { InterventionStatus } from '../intervention/intervention-status.type';

/**
 * Associates every queued operation with its persisted payload contract.
 */
export interface InterventionOutboxPayloadMap {
  readonly 'facility.create': CreateFacilityInput;
  readonly 'equipment.create': CreateEquipmentInput;
  readonly 'inspection.create': CreateInspectionInput;
  readonly 'media.create': {
    readonly clientId?: string;
    readonly equipmentId: string;
    readonly file: Blob;
    readonly fileName: string;
  };
  readonly 'intervention.update': Partial<{
    readonly clientId: string;
    readonly revision: number;
    readonly name: string;
    readonly status: InterventionStatus;
    readonly site: string | null;
    readonly responsible: string | null;
    readonly participants: readonly string[];
    readonly priority: InterventionOutput['priority'];
    readonly plannedStartAt: string | null;
    readonly dueAt: string | null;
    readonly referencePack: string;
    readonly reviewNote: string | null;
  }>;
  readonly 'work-item.create': CreateInterventionWorkItemInput;
  readonly 'work-item.update': UpdateInterventionWorkItemInput & {
    readonly clientId?: string;
    readonly workItemId: string;
    readonly revision?: number;
  };
  readonly 'change.create': CreateInterventionChangeInput;
  readonly 'change.update': UpdateInterventionChangeInput & {
    readonly clientId?: string;
    readonly changeId: string;
    readonly revision?: number;
  };
}
