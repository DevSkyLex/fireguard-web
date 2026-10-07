import { resolveInterventionEquipmentContext } from '../intervention-equipment-context.utils';

describe('resolveInterventionEquipmentContext', () => {
  const equipmentId = '00000000-0000-4000-8000-000000000001';
  const siteId = '00000000-0000-4000-8000-000000000002';

  it('prepares only canonical equipment actions and optional root-site hints', () => {
    expect(resolveInterventionEquipmentContext(equipmentId, 'repair', siteId)).toEqual({
      target: `/api/equipment/${equipmentId}`,
      action: 'repair',
      site: `/api/facilities/${siteId}`,
    });
    expect(resolveInterventionEquipmentContext(equipmentId, undefined)).toEqual({
      target: `/api/equipment/${equipmentId}`,
      action: 'inspection',
      site: '',
    });
  });

  it('rejects malformed identifiers and unrelated action hints before they reach a draft', () => {
    expect(resolveInterventionEquipmentContext('/api/equipment/foreign', 'repair')).toBeNull();
    expect(resolveInterventionEquipmentContext(equipmentId, 'site_setup')).toBeNull();
    expect(resolveInterventionEquipmentContext(undefined, 'maintenance')).toBeNull();
    expect(resolveInterventionEquipmentContext(equipmentId, 'repair', 'invalid')?.site).toBe('');
  });
});
