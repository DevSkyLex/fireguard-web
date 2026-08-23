import { interventionRecurrenceFrequencyLabel } from '../intervention-recurrence-frequency-label.utils';

describe('interventionRecurrenceFrequencyLabel', () => {
  it('names each cadence unit', () => {
    expect(interventionRecurrenceFrequencyLabel('weekly')).toBe('Weekly');
    expect(interventionRecurrenceFrequencyLabel('monthly')).toBe('Monthly');
    expect(interventionRecurrenceFrequencyLabel('quarterly')).toBe('Quarterly');
    expect(interventionRecurrenceFrequencyLabel('semiannual')).toBe('Every 6 months');
    expect(interventionRecurrenceFrequencyLabel('annual')).toBe('Yearly');
  });
});
