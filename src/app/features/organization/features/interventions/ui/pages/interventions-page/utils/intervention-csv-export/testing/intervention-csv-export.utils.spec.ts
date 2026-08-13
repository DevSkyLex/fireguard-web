import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { INTERVENTION_TABLE_COLUMN } from '../../../../../tables/intervention-table';
import { buildInterventionCsv, escapeCsvField } from '../intervention-csv-export.utils';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'a1b2',
    organization: '/api/organizations/1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: '2026-09-01T09:00:00+00:00',
    reviewNote: null,
    revision: 3,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-02T09:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

const labels = {
  columnLabelOf: (column: string): string => `col:${column}`,
  statusLabelOf: (value: string): string => `status:${value}`,
  typeLabelOf: (value: string): string => `type:${value}`,
  priorityLabelOf: (value: string): string => `priority:${value}`,
  siteLabelOf: (value: string): string => `site:${value}`,
};

describe('escapeCsvField', () => {
  it('should leave a plain field bare', () => {
    expect(escapeCsvField('Quarterly extinguisher sweep')).toBe('Quarterly extinguisher sweep');
  });

  it('should quote and double an embedded quote', () => {
    expect(escapeCsvField('12" hose, "spare"')).toBe('"12"" hose, ""spare"""');
  });

  it('should quote a field carrying the separator', () => {
    expect(escapeCsvField('Sweep, Building A')).toBe('"Sweep, Building A"');
  });

  it('should quote a field carrying an embedded newline', () => {
    expect(escapeCsvField('Line one\nLine two')).toBe('"Line one\nLine two"');
  });
});

describe('buildInterventionCsv', () => {
  it('should prepend the UTF-8 BOM and use CRLF line endings throughout', () => {
    const csv: string = buildInterventionCsv([intervention()], [], labels);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\r\n');
    expect(csv.includes('\n') && !csv.includes('\r\n')).toBe(false);
  });

  it('should always emit the reference and name columns, unquoted', () => {
    const csv: string = buildInterventionCsv([intervention()], [], labels);
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep');
  });

  it('should append only the visible columns, in the given order, using each resolver', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ status: 'planned', priority: 'high', type: 'inventory', site: null })],
      [INTERVENTION_TABLE_COLUMN.STATUS, INTERVENTION_TABLE_COLUMN.PRIORITY],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[0]).toBe('Ref.,Intervention,col:status,col:priority');
    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep,status:planned,priority:high');
  });

  it('should exclude a hidden column entirely, not just its value', () => {
    const csv: string = buildInterventionCsv(
      [intervention()],
      [INTERVENTION_TABLE_COLUMN.STATUS],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[0]).toBe('Ref.,Intervention,col:status');
    expect(lines[0]).not.toContain('col:priority');
  });

  it('should resolve the site column through siteLabelOf when a site is set', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ site: '/api/facilities/9' })],
      [INTERVENTION_TABLE_COLUMN.SITE],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep,site:/api/facilities/9');
  });

  it('should leave the site column blank rather than call the resolver when unset', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ site: null })],
      [INTERVENTION_TABLE_COLUMN.SITE],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep,');
  });

  it('should render the due date as a bare ISO date, not the localized medium date', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ dueAt: '2026-09-01T09:00:00+00:00' })],
      [INTERVENTION_TABLE_COLUMN.DUE],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep,2026-09-01');
  });

  it('should leave the due column blank when the intervention has no due date', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ dueAt: null })],
      [INTERVENTION_TABLE_COLUMN.DUE],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,Quarterly extinguisher sweep,');
  });

  it('should quote a name carrying a comma', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ name: 'Sweep, Building A' })],
      [],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n');

    expect(lines[1]).toBe('FG-42,"Sweep, Building A"');
  });

  it('should emit one line per row, in the given order', () => {
    const csv: string = buildInterventionCsv(
      [intervention({ id: 'a', number: 1 }), intervention({ id: 'b', number: 2 })],
      [],
      labels,
    );
    const lines: string[] = csv.slice(1).split('\r\n').filter(Boolean);

    expect(lines).toEqual([
      'Ref.,Intervention',
      'FG-1,Quarterly extinguisher sweep',
      'FG-2,Quarterly extinguisher sweep',
    ]);
  });

  it('should emit only the header row for an empty result set', () => {
    const csv: string = buildInterventionCsv([], [INTERVENTION_TABLE_COLUMN.STATUS], labels);
    const lines: string[] = csv.slice(1).split('\r\n').filter(Boolean);

    expect(lines).toEqual(['Ref.,Intervention,col:status']);
  });
});
