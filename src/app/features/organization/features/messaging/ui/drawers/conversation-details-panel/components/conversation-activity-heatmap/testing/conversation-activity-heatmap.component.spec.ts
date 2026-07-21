import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { ConversationActivityBucket } from '@features/organization/features/messaging/models';
import { ConversationActivityHeatmap } from '../conversation-activity-heatmap.component';

describe('ConversationActivityHeatmap', () => {
  let fixture: ComponentFixture<ConversationActivityHeatmap>;

  const render = (buckets: readonly ConversationActivityBucket[]): void => {
    fixture = TestBed.createComponent(ConversationActivityHeatmap);
    fixture.componentRef.setInput('buckets', buckets);
    fixture.detectChanges();
  };

  const cells = (): readonly HTMLElement[] =>
    fixture.debugElement
      .queryAll(By.css('[data-testid="activity-cell"]'))
      .map((debug) => debug.nativeElement as HTMLElement);

  const day = (index: number, count: number): ConversationActivityBucket =>
    ({
      bucket: `2026-07-${String(index).padStart(2, '0')}`,
      count,
    }) as ConversationActivityBucket;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConversationActivityHeatmap] });
  });

  it('renders one cell per bucket, in the order given', () => {
    render([day(1, 0), day(2, 4), day(3, 9)]);

    expect(cells()).toHaveLength(3);
    expect(cells().map((cell) => cell.getAttribute('data-level'))).toEqual(['0', '2', '3']);
  });

  // A silent day is a surface tint, never a pale primary: "no activity" and "a
  // little activity" must not look like neighbours on the same scale.
  it('maps counts to the four intensity steps', () => {
    render([day(1, 0), day(2, 1), day(3, 2), day(4, 3), day(5, 5), day(6, 6), day(7, 40)]);

    expect(cells().map((cell) => cell.getAttribute('data-level'))).toEqual([
      '0',
      '1',
      '1',
      '2',
      '2',
      '3',
      '3',
    ]);
    expect(cells()[0]?.className).toContain('bg-surface-100');
    expect(cells()[0]?.className).toContain('dark:bg-surface-800');
    expect(cells()[6]?.className).toContain('bg-primary-600');
    expect(cells()[6]?.className).toContain('dark:bg-primary-400');
  });

  // The tint alone says nothing to a screen reader, and nothing at all without
  // hover: every cell carries its own count and date.
  it('labels every cell with its count and day', () => {
    render([day(2, 1), day(3, 7)]);

    expect(cells()[0]?.getAttribute('aria-label')).toContain('1 message');
    expect(cells()[0]?.getAttribute('title')).toBe(cells()[0]?.getAttribute('aria-label'));
    expect(cells()[0]?.getAttribute('role')).toBe('img');
    expect(cells()[1]?.getAttribute('aria-label')).toContain('7 messages');
  });

  it('sums the window in the caption', () => {
    render([day(1, 2), day(2, 0), day(3, 5)]);

    expect(
      (
        fixture.debugElement.query(By.css('[data-testid="activity-caption"]'))
          .nativeElement as HTMLElement
      ).textContent,
    ).toContain('7');
  });

  // No animation the reader did not ask for: the only transition is gated on
  // `motion-safe`.
  it('gates its colour transition on prefers-reduced-motion', () => {
    render([day(1, 1)]);

    expect(cells()[0]?.className).toContain('motion-safe:transition-colors');
  });

  it('renders nothing when the read produced no buckets', () => {
    render([]);

    expect(cells()).toHaveLength(0);
  });
});
