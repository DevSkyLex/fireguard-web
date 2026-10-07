import type {
  CreateMaintenanceExpenseInput,
  CreateMaintenanceRateInput,
  WriteMaintenanceCostPlanningInput,
} from '@features/organization/features/maintenance-costs/models';

/**
 * Type MaintenanceCostCommand
 *
 * @description
 * One serialized financial write, retaining its original identity and displayed planning revision
 * for retries.
 *
 * @type MaintenanceCostCommand
 */
export type MaintenanceCostCommand =
  | {
      readonly kind: 'planning';
      readonly organizationId: string;
      readonly interventionId: string;
      readonly revision: number;
      readonly input: WriteMaintenanceCostPlanningInput;
    }
  | {
      readonly kind: 'expense';
      readonly organizationId: string;
      readonly interventionId: string;
      readonly input: CreateMaintenanceExpenseInput;
    }
  | { readonly kind: 'currency'; readonly organizationId: string; readonly currency: string }
  | {
      readonly kind: 'rate';
      readonly organizationId: string;
      readonly input: CreateMaintenanceRateInput;
    };
