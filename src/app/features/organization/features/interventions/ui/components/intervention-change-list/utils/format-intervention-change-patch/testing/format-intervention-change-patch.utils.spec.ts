import type { InterventionChangePatchLine } from '../../../models';
import { formatInterventionChangePatch } from '../format-intervention-change-patch.utils';

describe('formatInterventionChangePatch', () => {
  it('should humanize camelCase field names', () => {
    const lines: readonly InterventionChangePatchLine[] = formatInterventionChangePatch({
      locationLabel: 'Rack B-12',
    });

    expect(lines).toEqual([{ field: 'Location label', value: 'Rack B-12' }]);
  });

  it('should render a null value as a dash rather than the literal null', () => {
    const lines: readonly InterventionChangePatchLine[] = formatInterventionChangePatch({
      facility: null,
    });

    expect(lines[0]?.value).toBe('—');
  });

  it('should render a boolean as Yes or No', () => {
    const lines: readonly InterventionChangePatchLine[] = formatInterventionChangePatch({
      required: true,
    });

    expect(lines[0]?.value).toBe('Yes');
  });

  it('should flatten a nested object instead of printing raw JSON', () => {
    const lines: readonly InterventionChangePatchLine[] = formatInterventionChangePatch({
      metadata: { floor: '3', wing: 'A' },
    });

    expect(lines[0]?.value).toBe('Floor: 3, Wing: A');
    expect(lines[0]?.value).not.toContain('{');
  });

  it('should format one line per patched field, in order', () => {
    const lines: readonly InterventionChangePatchLine[] = formatInterventionChangePatch({
      status: 'operational',
      brand: 'Acme',
    });

    expect(lines.map((line) => line.field)).toEqual(['Status', 'Brand']);
  });

  it('should return an empty list for an empty patch', () => {
    expect(formatInterventionChangePatch({})).toEqual([]);
  });
});
