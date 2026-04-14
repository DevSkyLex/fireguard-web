import type { InspectorTypeOption } from '../models';

/**
 * Constant INSPECTOR_TYPE_OPTIONS
 * @const INSPECTOR_TYPE_OPTIONS
 *
 * @description
 * Defines the available inspector type options for filtering and display
 * in the organization dashboard. Each option includes a label for display
 * and a corresponding value for internal use.
 *
 * @type {readonly InspectorTypeOption[]}
 */
export const INSPECTOR_TYPE_OPTIONS: readonly InspectorTypeOption[] = [
  {
    label: 'User',
    value: 'user'
  },
  {
    label: 'External',
    value: 'external'
  },
];
