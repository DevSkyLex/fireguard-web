import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  DASHBOARD_PERSISTENCE_VERSION,
  buildDashboardStorageKey,
  writeDashboardStorage,
} from '../../../utils';
import { InspectionQualityTrendStore } from '../organization-dashboard-inspection-quality-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

const inspectionsTrend: OrganizationDashboardTrendOutput = {
  '@id': '/api/organizations/org-1/dashboard/trends/inspections',
  '@type': 'OrganizationDashboardTrend',
  generatedAt: '2026-04-08T10:00:00Z',
  metric: 'inspections',
  period: {
    granularity: 'week',
    from: '2026-03-01T00:00:00Z',
    to: '2026-04-01T00:00:00Z',
  },
  summary: { total: 20 },
  series: [{ bucket: '2026-03-10', value: 10 }],
  comparison: { series: [{ bucket: '2026-02-10', value: 8 }] },
};

const ncOpenedTrend: OrganizationDashboardTrendOutput = {
  '@id': '/api/organizations/org-1/dashboard/trends/nc-opened',
  '@type': 'OrganizationDashboardTrend',
  generatedAt: '2026-04-08T10:00:00Z',
  metric: 'nonConformitiesOpened',
  period: {
    granularity: 'week',
    from: '2026-03-01T00:00:00Z',
    to: '2026-04-01T00:00:00Z',
  },
  summary: { total: 4 },
  series: [{ bucket: '2026-03-10', value: 4 }],
  comparison: { series: [{ bucket: '2026-02-10', value: 2 }] },
};

const organization: OrganizationOutput = {
  '@id': '/api/organizations/org-1',
  '@type': 'Organization',
  id: 'org-1',
  name: 'Fireguard',
  slug: 'fireguard',
  ownerUserId: 'user-1',
  createdByUserId: 'user-1',
  status: 'active',
  isActive: true,
  memberCount: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const STORAGE_KEY = buildDashboardStorageKey('org-1', 'inspection-quality');

describe('OrganizationDashboardInspectionQualityStore — persistence', () => {
  let mockOrganizationService: {
    getDashboardInspectionsTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();

    mockOrganizationService = {
      getDashboardInspectionsTrend: vi.fn().mockReturnValue(of(inspectionsTrend)),
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(ncOpenedTrend)),
    };
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  function createStore(orgId = 'org-1') {
    const org: OrganizationOutput = { ...organization, id: orgId };
    TestBed.configureTestingModule({
      providers: [
        InspectionQualityTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(org) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    return TestBed.inject(InspectionQualityTrendStore);
  }

  describe('hydration from localStorage', () => {
    it('should restore persisted base filters before the first API call', async () => {
      const from = new Date('2026-02-01T00:00:00.000Z');
      const to = new Date('2026-03-01T00:00:00.000Z');

      writeDashboardStorage(STORAGE_KEY, {
        _v: DASHBOARD_PERSISTENCE_VERSION,
        granularity: 'month',
        dateRange: [from.toISOString(), to.toISOString()],
        compareEnabled: false,
        inspectionStatus: null,
        inspectionResult: null,
        inspectorType: null,
        nonConformitySeverity: null,
      });

      const store = createStore();
      await flushEffects();

      expect(store.selectedGranularity()).toBe('month');
      expect(store.compareEnabled()).toBe(false);
      expect(store.selectedDateRange()?.[0].toISOString()).toBe(from.toISOString());
      expect(store.selectedDateRange()?.[1].toISOString()).toBe(to.toISOString());

      // First API call must use the restored granularity, not the default 'week'.
      expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ granularity: 'month', compare: undefined }),
      );
    });

    it('should restore persisted dimension filters before the first API call', async () => {
      writeDashboardStorage(STORAGE_KEY, {
        _v: DASHBOARD_PERSISTENCE_VERSION,
        granularity: 'week',
        dateRange: null,
        compareEnabled: true,
        inspectionStatus: 'completed',
        inspectionResult: 'passed',
        inspectorType: 'internal',
        nonConformitySeverity: 'major',
      });

      const store = createStore();
      await flushEffects();

      expect(store.selectedInspectionStatus()).toBe('completed');
      expect(store.selectedInspectionResult()).toBe('passed');
      expect(store.selectedInspectorType()).toBe('internal');
      expect(store.selectedNonConformitySeverity()).toBe('major');

      expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          inspectionStatus: 'completed',
          inspectionResult: 'passed',
          inspectorType: 'internal',
        }),
      );
    });

    it('should use default state when no persisted payload exists', async () => {
      const store = createStore();
      await flushEffects();

      expect(store.selectedGranularity()).toBe('week');
      expect(store.compareEnabled()).toBe(true);
      expect(store.selectedInspectionStatus()).toBeNull();
    });

    it('should fall back to defaults when the persisted payload has an old version', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ _v: 0, granularity: 'day', dateRange: null, compareEnabled: false }),
      );

      const store = createStore();
      await flushEffects();

      expect(store.selectedGranularity()).toBe('week');
    });

    it('should fall back to defaults when the persisted payload is invalid JSON', async () => {
      localStorage.setItem(STORAGE_KEY, '{ not valid json }');

      const store = createStore();
      await flushEffects();

      expect(store.selectedGranularity()).toBe('week');
    });

    it('should clamp a restored date range that exceeds maxRangeDays for the granularity', async () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const tooFar = new Date('2027-06-01T00:00:00.000Z'); // > 90 days for 'day'

      writeDashboardStorage(STORAGE_KEY, {
        _v: DASHBOARD_PERSISTENCE_VERSION,
        granularity: 'day',
        dateRange: [from.toISOString(), tooFar.toISOString()],
        compareEnabled: true,
        inspectionStatus: null,
        inspectionResult: null,
        inspectorType: null,
        nonConformitySeverity: null,
      });

      const store = createStore();
      await flushEffects();

      const range = store.selectedDateRange();
      expect(range).not.toBeNull();
      expect(range![1].getTime()).toBe(from.getTime() + 90 * 24 * 60 * 60 * 1000);
    });
  });

  describe('persistence write effect', () => {
    it('should write current filter state to localStorage on init', async () => {
      createStore();
      await flushEffects();

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed._v).toBe(DASHBOARD_PERSISTENCE_VERSION);
      expect(parsed.granularity).toBe('week');
      expect(parsed.compareEnabled).toBe(true);
    });

    it('should update localStorage when a dimension filter changes', async () => {
      const store = createStore();
      await flushEffects();

      store.setInspectionStatus('completed' as never);
      await flushEffects();

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.inspectionStatus).toBe('completed');
    });

    it('should update localStorage when granularity changes', async () => {
      const store = createStore();
      await flushEffects();

      store.setGranularity('month');
      await flushEffects();

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.granularity).toBe('month');
    });
  });

  describe('SSR — server platform', () => {
    it('should not read or write localStorage on the server', async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      TestBed.configureTestingModule({
        providers: [
          InspectionQualityTrendStore,
          { provide: OrganizationService, useValue: mockOrganizationService },
          {
            provide: ActiveOrganizationStore,
            useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
          },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const store = TestBed.inject(InspectionQualityTrendStore);
      await flushEffects();

      // State should remain at defaults.
      expect(store.selectedGranularity()).toBe('week');
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('organization isolation', () => {
    it('should use a different key for a different organizationId', async () => {
      // Seed data for org-1.
      writeDashboardStorage(buildDashboardStorageKey('org-1', 'inspection-quality'), {
        _v: DASHBOARD_PERSISTENCE_VERSION,
        granularity: 'month',
        dateRange: null,
        compareEnabled: false,
        inspectionStatus: null,
        inspectionResult: null,
        inspectorType: null,
        nonConformitySeverity: null,
      });

      // Store created for org-2 must NOT pick up org-1's saved filters.
      const store = createStore('org-2');
      await flushEffects();

      expect(store.selectedGranularity()).toBe('week');
      expect(store.compareEnabled()).toBe(true);
    });
  });
});

