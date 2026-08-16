import type { PlanTransform } from '../../../models/plan-transform.interface';
import {
  clampPlanPan,
  clampPlanZoom,
  planPointerDistance,
  planPointerMidpoint,
  zoomPlanAtPoint,
} from '../plan-transform.utils';

describe('plan transform utils', () => {
  describe('clampPlanZoom', () => {
    it('should pass a scale through unchanged when inside the range', () => {
      expect(clampPlanZoom(2, 0.5, 8)).toBe(2);
    });

    it('should confine a scale below the minimum', () => {
      expect(clampPlanZoom(0.1, 0.5, 8)).toBe(0.5);
    });

    it('should confine a scale above the maximum', () => {
      expect(clampPlanZoom(20, 0.5, 8)).toBe(8);
    });
  });

  describe('zoomPlanAtPoint', () => {
    const viewport = { width: 800, height: 600 };

    it('should keep the content point under the pointer fixed on screen', () => {
      const transform: PlanTransform = { x: 10, y: -20, scale: 1 };
      const pointer = { x: 300, y: 200 };

      const before = zoomPlanAtPoint(transform, pointer, viewport, 1, 0.5, 8);
      const localBefore = {
        x: (pointer.x - viewport.width / 2 - transform.x) / transform.scale,
        y: (pointer.y - viewport.height / 2 - transform.y) / transform.scale,
      };

      const after = zoomPlanAtPoint(transform, pointer, viewport, 2, 0.5, 8);
      const localAfter = {
        x: (pointer.x - viewport.width / 2 - after.x) / after.scale,
        y: (pointer.y - viewport.height / 2 - after.y) / after.scale,
      };

      expect(before).toEqual({ x: transform.x, y: transform.y, scale: transform.scale });
      expect(localAfter.x).toBeCloseTo(localBefore.x, 10);
      expect(localAfter.y).toBeCloseTo(localBefore.y, 10);
    });

    it('should scale the translation around the viewport center when zooming there', () => {
      const transform: PlanTransform = { x: 40, y: 60, scale: 1 };
      const center = { x: viewport.width / 2, y: viewport.height / 2 };

      const result = zoomPlanAtPoint(transform, center, viewport, 2, 0.5, 8);

      expect(result).toEqual({ x: 80, y: 120, scale: 2 });
    });

    it('should clamp the resulting scale and derive translation from the effective factor', () => {
      const transform: PlanTransform = { x: 0, y: 0, scale: 6 };

      const result = zoomPlanAtPoint(transform, { x: 400, y: 300 }, viewport, 4, 0.5, 8);

      expect(result.scale).toBe(8);
    });

    it('should leave the transform unchanged when the pointer sits at the anchor and factor is 1', () => {
      const transform: PlanTransform = { x: 5, y: 5, scale: 3 };

      const result = zoomPlanAtPoint(transform, { x: 400, y: 300 }, viewport, 1, 0.5, 8);

      expect(result).toEqual(transform);
    });
  });

  describe('clampPlanPan', () => {
    const viewport = { width: 800, height: 600 };
    const content = { width: 1000, height: 500 };

    it('should pass translation through when the scaled content still overlaps the viewport well', () => {
      const transform: PlanTransform = { x: 10, y: -10, scale: 1 };

      expect(clampPlanPan(transform, viewport, content, 40)).toEqual(transform);
    });

    it('should clamp translation so a minimum sliver of content stays visible on each edge', () => {
      const transform: PlanTransform = { x: 100000, y: -100000, scale: 1 };

      const result = clampPlanPan(transform, viewport, content, 40);

      expect(result.x).toBeLessThan(transform.x);
      expect(result.y).toBeGreaterThan(transform.y);

      const halfViewportW = viewport.width / 2;
      const halfContentW = (content.width * transform.scale) / 2;
      expect(result.x).toBeCloseTo(halfViewportW - 40 + halfContentW, 10);
    });

    it('should collapse pan to zero once the required margin exceeds the legal range', () => {
      const transform: PlanTransform = { x: 500, y: -500, scale: 0.01 };

      const result = clampPlanPan(transform, viewport, content, 500);

      expect(result).toEqual({ x: 0, y: 0, scale: 0.01 });
    });

    it('should never leave the scaled content fully off-screen at any clamped edge', () => {
      const transform: PlanTransform = { x: -100000, y: 100000, scale: 2 };
      const minVisiblePx = 40;

      const result = clampPlanPan(transform, viewport, content, minVisiblePx);

      const halfViewportW = viewport.width / 2;
      const halfContentW = (content.width * transform.scale) / 2;
      const rightEdge = halfViewportW + result.x + halfContentW;
      const leftEdge = halfViewportW + result.x - halfContentW;

      expect(rightEdge).toBeGreaterThanOrEqual(minVisiblePx - 1e-9);
      expect(leftEdge).toBeLessThanOrEqual(viewport.width - minVisiblePx + 1e-9);
    });
  });

  describe('planPointerDistance', () => {
    it('should measure the straight-line distance between two points', () => {
      expect(planPointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should return zero for coincident points', () => {
      expect(planPointerDistance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
    });
  });

  describe('planPointerMidpoint', () => {
    it('should average two points', () => {
      expect(planPointerMidpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
    });
  });
});
