import type { ConversationActivityBucketOutput } from '../../models';
import { buildActivityCells } from '../build-activity-cells.utils';

function bucket(day: string, count: number): ConversationActivityBucketOutput {
  return { '@id': `/x/${day}`, '@type': 'Bucket', bucket: day, count };
}

describe('buildActivityCells', () => {
  it('should return nothing for an empty window', () => {
    expect(buildActivityCells([])).toEqual([]);
  });

  it('should keep the buckets in order and carry their raw counts through', () => {
    const cells = buildActivityCells([
      bucket('2026-07-20', 3),
      bucket('2026-07-21', 0),
      bucket('2026-07-22', 9),
    ]);

    expect(cells.map((cell) => cell.bucket)).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
    expect(cells.map((cell) => cell.count)).toEqual([3, 0, 9]);
  });

  it('should always give the busiest day the top level', () => {
    const cells = buildActivityCells([bucket('a', 1), bucket('b', 40), bucket('c', 2)]);

    expect(cells[1].level).toBe(3);
  });

  it('should grade the other days against that peak', () => {
    // Peak 9: 3/9 lands in the first third, 6/9 in the second.
    const cells = buildActivityCells([bucket('a', 3), bucket('b', 6), bucket('c', 9)]);

    expect(cells.map((cell) => cell.level)).toEqual([1, 2, 3]);
  });

  it('should keep a silent day at level 0 even when the peak is tiny', () => {
    const cells = buildActivityCells([bucket('a', 0), bucket('b', 1)]);

    // A single message makes the peak, but a silent day must still read silent.
    expect(cells.map((cell) => cell.level)).toEqual([0, 3]);
  });

  it('should never grade a non-zero day below level 1', () => {
    // 1/1000 rounds to 0 before the floor is applied.
    const cells = buildActivityCells([bucket('a', 1), bucket('b', 1000)]);

    expect(cells[0].level).toBe(1);
  });

  it('should leave every cell at level 0 when nothing happened', () => {
    const cells = buildActivityCells([bucket('a', 0), bucket('b', 0)]);

    expect(cells.map((cell) => cell.level)).toEqual([0, 0]);
  });
});
