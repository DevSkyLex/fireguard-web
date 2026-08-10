import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { FacilityStatus } from '@features/organization/features/facilities/models';
import type {
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import type { InterventionChangeStatus } from '../../intervention-change/intervention-change-status.type';
import type { InterventionWorkItemAction } from '../../intervention-work-item/intervention-work-item-action.type';
import type { InterventionWorkItemStatus } from '../../intervention-work-item/intervention-work-item-status.type';
import type { InterventionIssueSeverity } from '../../intervention/intervention-issue-severity.type';
import type { InterventionPriority } from '../../intervention/intervention-priority.type';
import type { InterventionStatus } from '../../intervention/intervention-status.type';
import type { InterventionType } from '../../intervention/intervention-type.type';
import type { InterventionTagDescriptor } from '../intervention-tag-descriptor.interface';
import type { InterventionTagKind } from '../intervention-tag-kind.type';
import { resolveInterventionTag } from '../intervention-tag.util';

const PRIORITY_VALUES: readonly InterventionPriority[] = ['low', 'normal', 'high', 'urgent'];
const STATUS_VALUES: readonly InterventionStatus[] = [
  'draft',
  'planned',
  'in_progress',
  'submitted',
  'changes_requested',
  'published',
  'abandoned',
];
const TYPE_VALUES: readonly InterventionType[] = ['site_setup', 'inventory', 'inspection_campaign'];
const WORK_ITEM_ACTION_VALUES: readonly InterventionWorkItemAction[] = [
  'site_setup',
  'inventory',
  'inspection',
];
const WORK_ITEM_STATUS_VALUES: readonly InterventionWorkItemStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'skipped',
];
const ISSUE_SEVERITY_VALUES: readonly InterventionIssueSeverity[] = [
  'blocker',
  'warning',
  'recommendation',
];
const CHANGE_STATUS_VALUES: readonly InterventionChangeStatus[] = [
  'proposed',
  'rejected',
  'applied',
];
const INSPECTION_RESULT_VALUES: readonly InspectionResult[] = ['pass', 'partial', 'fail'];
const INSPECTION_STATUS_VALUES: readonly InspectionStatus[] = [
  'draft',
  'submitted',
  'closed',
  'cancelled',
];
const FACILITY_STATUS_VALUES: readonly FacilityStatus[] = ['active', 'archived'];
const EQUIPMENT_STATUS_VALUES: readonly EquipmentStatus[] = [
  'in_stock',
  'operational',
  'decommissioned',
  'under_maintenance',
];

const EXHAUSTIVE_KINDS: ReadonlyArray<{
  readonly kind: InterventionTagKind;
  readonly values: readonly string[];
}> = [
  { kind: 'priority', values: PRIORITY_VALUES },
  { kind: 'status', values: STATUS_VALUES },
  { kind: 'type', values: TYPE_VALUES },
  { kind: 'workItemAction', values: WORK_ITEM_ACTION_VALUES },
  { kind: 'workItemStatus', values: WORK_ITEM_STATUS_VALUES },
  { kind: 'issueSeverity', values: ISSUE_SEVERITY_VALUES },
  { kind: 'changeStatus', values: CHANGE_STATUS_VALUES },
  { kind: 'inspectionResult', values: INSPECTION_RESULT_VALUES },
  { kind: 'inspectionStatus', values: INSPECTION_STATUS_VALUES },
  { kind: 'facilityStatus', values: FACILITY_STATUS_VALUES },
  { kind: 'equipmentStatus', values: EQUIPMENT_STATUS_VALUES },
];

describe('resolveInterventionTag', () => {
  it('should resolve a representative descriptor for every tag kind', () => {
    const cases: ReadonlyArray<{
      readonly kind: InterventionTagKind;
      readonly value: string;
      readonly label: string;
      readonly icon: string;
    }> = [
      { kind: 'priority', value: 'urgent', label: 'Urgent', icon: 'lucideChevronsUp' },
      { kind: 'status', value: 'published', label: 'Published', icon: 'lucideCircleCheck' },
      { kind: 'type', value: 'inventory', label: 'Inventory', icon: 'lucidePackage' },
      {
        kind: 'workItemAction',
        value: 'inspection',
        label: 'Inspection',
        icon: 'lucideBadgeCheck',
      },
      {
        kind: 'workItemStatus',
        value: 'completed',
        label: 'Completed',
        icon: 'lucideCheck',
      },
      { kind: 'issueSeverity', value: 'blocker', label: 'Blocker', icon: 'lucideBan' },
      { kind: 'changeStatus', value: 'applied', label: 'Applied', icon: 'lucideCheck' },
      { kind: 'inspectionResult', value: 'fail', label: 'Fail', icon: 'lucideCircleX' },
      { kind: 'inspectionStatus', value: 'closed', label: 'Closed', icon: 'lucideCircleCheck' },
      { kind: 'facilityStatus', value: 'active', label: 'Active', icon: 'lucideCircleCheck' },
      {
        kind: 'equipmentStatus',
        value: 'under_maintenance',
        label: 'Under maintenance',
        icon: 'lucideWrench',
      },
    ];

    for (const { kind, value, label, icon } of cases) {
      const descriptor: InterventionTagDescriptor = resolveInterventionTag(kind, value);
      expect(descriptor.label).toBe(label);
      expect(descriptor.icon).toBe(icon);
      expect(descriptor.severity).toBeTruthy();
    }
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: InterventionTagDescriptor = resolveInterventionTag(
      'status',
      'some_unknown_value',
    );

    expect(descriptor).toEqual({
      label: 'some unknown value',
      severity: 'neutral',
      icon: 'lucideTag',
    });
  });

  it('should humanise a fallback value with no underscores unchanged', () => {
    const descriptor: InterventionTagDescriptor = resolveInterventionTag('priority', 'mystery');

    expect(descriptor.label).toBe('mystery');
    expect(descriptor.severity).toBe('neutral');
    expect(descriptor.icon).toBe('lucideTag');
  });

  describe.each(EXHAUSTIVE_KINDS)('for the $kind kind', ({ kind, values }) => {
    it('should resolve every union value to a non-fallback descriptor', () => {
      for (const value of values) {
        const descriptor: InterventionTagDescriptor = resolveInterventionTag(kind, value);

        expect(descriptor.icon).not.toBe('lucideTag');
        expect(descriptor.label).not.toBe(value.replace(/_/g, ' '));
        expect(descriptor.label.length).toBeGreaterThan(0);
      }
    });
  });
});
