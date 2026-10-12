import { calendarSourceLabelOf } from '../calendar-source-label.utils';

describe('calendarSourceLabelOf', () => {
  it('retains additional and historical source identifiers as text', () => {
    expect(calendarSourceLabelOf('external_review')).toBe('external_review');
    expect(calendarSourceLabelOf('constructor')).toBe('constructor');
  });
  it('names a standalone event', () => {
    expect(calendarSourceLabelOf('calendar_event')).toBe('Event');
  });

  it('names an inspection', () => {
    expect(calendarSourceLabelOf('inspection')).toBe('Inspection');
  });

  it('names an intervention', () => {
    expect(calendarSourceLabelOf('intervention')).toBe('Intervention');
  });

  it('names a maintenance schedule', () => {
    expect(calendarSourceLabelOf('maintenance')).toBe('Maintenance');
  });
});
