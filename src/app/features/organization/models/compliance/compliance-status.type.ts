/**
 * Type ComplianceStatus
 *
 * @description
 * The regulatory compliance verdict graded by the backend Compliance module
 * from Maintenance due-status, Inspection non-conformity, and Equipment
 * inventory counts. Byte-for-byte the same literals the API returns.
 */
export type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant' | 'not_applicable';
