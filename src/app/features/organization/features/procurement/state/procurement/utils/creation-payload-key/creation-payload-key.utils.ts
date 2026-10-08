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
        Object.entries(value).toSorted(([left], [right]) => compareCreationKeys(left, right)),
      );
    },
  );
}

/**
 * Function compareCreationKeys
 *
 * @description
 * Preserves code-unit ordering so replay identities never depend on the browser's locale.
 *
 * @access private
 *
 * @param {string} left - First object key.
 * @param {string} right - Second object key.
 *
 * @returns {number} Original lexical ordering of the two keys.
 */
function compareCreationKeys(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
