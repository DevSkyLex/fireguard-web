import type {
  CreatePurchaseOrderInput,
  CreateSupplierInput,
} from '@features/organization/features/procurement/models';

/**
 * Function creationPayloadKey
 *
 * @description
 * Compares the submitted creation fields independently from the operation UUID and object key
 * order. Arrays retain their order because draft lines and contacts are part of the submitted
 * command.
 *
 * @access public
 *
 * @param {CreateSupplierInput | CreatePurchaseOrderInput} input - Exact creation payload to
 *   compare.
 *
 * @returns {string} Stable JSON representation of the business fields.
 */
export function creationPayloadKey(input: CreateSupplierInput | CreatePurchaseOrderInput): string {
  return JSON.stringify(
    { ...input, clientOperationId: undefined },
    (_key, value: unknown): unknown => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
      return Object.fromEntries(
        Object.entries(value).toSorted(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        ),
      );
    },
  );
}
