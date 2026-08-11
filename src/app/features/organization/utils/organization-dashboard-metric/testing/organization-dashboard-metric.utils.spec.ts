import type {
  OrganizationDashboardComparison,
  OrganizationDashboardHealth,
  OrganizationDashboardOverview,
} from '@features/organization/models';
import {
  getOrganizationDashboardHealthComparisonDelta,
  getOrganizationDashboardHealthValue,
  getOrganizationDashboardNonConformitySeverityBreakdown,
  getOrganizationDashboardOverviewMetricValue,
} from '../organization-dashboard-metric.utils';

describe('organization-dashboard-metric utils', () => {
  describe('getOrganizationDashboardOverviewMetricValue', () => {
    const overview: OrganizationDashboardOverview = {
      nonConformities: {
        summary: [
          { key: 'open', value: 4 },
          { key: 'overdue', value: 1 },
        ],
      },
    };

    it('reads a numeric metric by widget and metric key', () => {
      expect(getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'open')).toBe(
        4,
      );
    });

    it('returns null when the widget is absent', () => {
      expect(
        getOrganizationDashboardOverviewMetricValue(overview, 'inspections', 'open'),
      ).toBeNull();
    });

    it('returns null when the metric key is absent from the widget', () => {
      expect(
        getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'closed'),
      ).toBeNull();
    });

    it('returns null when the overview itself is undefined', () => {
      expect(
        getOrganizationDashboardOverviewMetricValue(undefined, 'nonConformities', 'open'),
      ).toBeNull();
    });

    it('returns null when the value is not numeric', () => {
      const stringy: OrganizationDashboardOverview = {
        nonConformities: { summary: [{ key: 'open', value: 'n/a' }] },
      };

      expect(
        getOrganizationDashboardOverviewMetricValue(stringy, 'nonConformities', 'open'),
      ).toBeNull();
    });
  });

  describe('getOrganizationDashboardNonConformitySeverityBreakdown', () => {
    it('orders every severity from critical to low, zero-filling what is absent', () => {
      const overview: OrganizationDashboardOverview = {
        nonConformities: {
          summary: [
            { key: 'severityCritical', value: 2 },
            { key: 'severityHigh', value: 5 },
          ],
        },
      };

      expect(getOrganizationDashboardNonConformitySeverityBreakdown(overview)).toEqual([
        { severity: 'critical', count: 2 },
        { severity: 'high', count: 5 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 },
      ]);
    });

    it('zero-fills every severity when overview is undefined', () => {
      expect(getOrganizationDashboardNonConformitySeverityBreakdown(undefined)).toEqual([
        { severity: 'critical', count: 0 },
        { severity: 'high', count: 0 },
        { severity: 'medium', count: 0 },
        { severity: 'low', count: 0 },
      ]);
    });
  });

  describe('getOrganizationDashboardHealthValue', () => {
    const health: OrganizationDashboardHealth = {
      metrics: [{ key: 'nonConformityResolutionRate', value: 87.5 }],
    };

    it('reads a health metric by key', () => {
      expect(getOrganizationDashboardHealthValue(health, 'nonConformityResolutionRate')).toBe(87.5);
    });

    it('returns null when the metric key is absent', () => {
      expect(getOrganizationDashboardHealthValue(health, 'missing')).toBeNull();
    });

    it('returns null when health is undefined', () => {
      expect(
        getOrganizationDashboardHealthValue(undefined, 'nonConformityResolutionRate'),
      ).toBeNull();
    });
  });

  describe('getOrganizationDashboardHealthComparisonDelta', () => {
    it('reads a signed delta and its direction', () => {
      const comparison: OrganizationDashboardComparison = {
        health: { metrics: [{ key: 'nonConformityResolutionRate', delta: 3.2, direction: 'up' }] },
      };

      expect(
        getOrganizationDashboardHealthComparisonDelta(comparison, 'nonConformityResolutionRate'),
      ).toEqual({ delta: 3.2, direction: 'up' });
    });

    it('returns null when no comparison period was fetched', () => {
      expect(
        getOrganizationDashboardHealthComparisonDelta(undefined, 'nonConformityResolutionRate'),
      ).toBeNull();
    });

    it('returns null when the metric carries no delta', () => {
      const comparison: OrganizationDashboardComparison = {
        health: { metrics: [{ key: 'nonConformityResolutionRate', direction: 'up' }] },
      };

      expect(
        getOrganizationDashboardHealthComparisonDelta(comparison, 'nonConformityResolutionRate'),
      ).toBeNull();
    });

    it('returns null when the metric key is absent', () => {
      const comparison: OrganizationDashboardComparison = {
        health: { metrics: [{ key: 'other', delta: 1, direction: 'down' }] },
      };

      expect(
        getOrganizationDashboardHealthComparisonDelta(comparison, 'nonConformityResolutionRate'),
      ).toBeNull();
    });
  });
});
