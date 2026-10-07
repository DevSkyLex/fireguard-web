import type {
  ChangeSupplierInput,
  SupplierOutput,
  ChangePurchaseOrderInput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ReceivePurchaseOrderInput,
  IndividualizeReceiptInput,
  ReturnProcurementReceiptInput,
  ProcurementReturnOutput,
  ReconcileProcurementReturnInput,
} from '@features/organization/features/procurement/models';

/**
 * Type ProcurementCommand
 *
 * @description
 * One accepted write, retaining the original scope, resource revision and exact payload.
 *
 * @type {ProcurementCommand}
 */
export type ProcurementCommand =
  | {
      readonly kind: 'create_supplier';
      readonly organizationId: string;
      readonly input: ChangeSupplierInput;
    }
  | {
      readonly kind: 'update_supplier';
      readonly organizationId: string;
      readonly supplier: SupplierOutput;
      readonly input: ChangeSupplierInput;
    }
  | {
      readonly kind: 'archive_supplier';
      readonly organizationId: string;
      readonly supplier: SupplierOutput;
    }
  | {
      readonly kind: 'create_order';
      readonly organizationId: string;
      readonly input: ChangePurchaseOrderInput;
    }
  | {
      readonly kind: 'update_order';
      readonly organizationId: string;
      readonly order: PurchaseOrderOutput;
      readonly input: ChangePurchaseOrderInput;
    }
  | {
      readonly kind: 'place_order' | 'cancel_remaining';
      readonly organizationId: string;
      readonly order: PurchaseOrderOutput;
    }
  | {
      readonly kind: 'receive';
      readonly organizationId: string;
      readonly order: PurchaseOrderOutput;
      readonly input: ReceivePurchaseOrderInput;
    }
  | {
      readonly kind: 'individualize';
      readonly organizationId: string;
      readonly receipt: ProcurementReceiptOutput;
      readonly input: IndividualizeReceiptInput;
    }
  | {
      readonly kind: 'reconcile';
      readonly organizationId: string;
      readonly returned: ProcurementReturnOutput;
      readonly input: ReconcileProcurementReturnInput;
    }
  | {
      readonly kind: 'return';
      readonly organizationId: string;
      readonly receipt: ProcurementReceiptOutput;
      readonly input: ReturnProcurementReceiptInput;
    };

/**
 * Type ProcurementMutationOutput
 *
 * @description
 * The resource projection returned by a confirmed procurement mutation.
 *
 * @type {ProcurementMutationOutput}
 */
export type ProcurementMutationOutput =
  | SupplierOutput
  | PurchaseOrderOutput
  | ProcurementReceiptOutput
  | ProcurementReturnOutput;
