import { interventionRecurrenceFrequencyLabel } from '../intervention-recurrence-frequency-label.utils';

describe('interventionRecurrenceFrequencyLabel', () => {
  it('names each cadence unit with no interval', () => {
    expect(interventionRecurrenceFrequencyLabel('weekly')).toBe('Weekly');
    expect(interventionRecurrenceFrequencyLabel('monthly')).toBe('Monthly');
    expect(interventionRecurrenceFrequencyLabel('quarterly')).toBe('Quarterly');
    expect(interventionRecurrenceFrequencyLabel('semiannual')).toBe('Every 6 months');
    expect(interventionRecurrenceFrequencyLabel('annual')).toBe('Yearly');
  });

  it('keeps the bare unit label when the interval is 1', () => {
    expect(interventionRecurrenceFrequencyLabel('weekly', 1)).toBe('Weekly');
    expect(interventionRecurrenceFrequencyLabel('monthly', 1)).toBe('Monthly');
  });

  it('spells out the cadence multiplier as "Every N units" for an interval above 1', () => {
    expect(interventionRecurrenceFrequencyLabel('weekly', 2)).toBe('Every 2 weeks');
    expect(interventionRecurrenceFrequencyLabel('monthly', 3)).toBe('Every 3 months');
    expect(interventionRecurrenceFrequencyLabel('quarterly', 2)).toBe('Every 2 quarters');
    expect(interventionRecurrenceFrequencyLabel('semiannual', 2)).toBe('Every 2 half-years');
    expect(interventionRecurrenceFrequencyLabel('annual', 5)).toBe('Every 5 years');
  });
});
