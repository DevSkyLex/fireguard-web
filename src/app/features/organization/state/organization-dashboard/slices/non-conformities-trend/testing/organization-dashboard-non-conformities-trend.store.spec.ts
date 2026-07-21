import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { NonConformitiesTrendStore } from '../organization-dashboard-non-conformities-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('NonConformitiesTrendStore', () => {
  let store: InstanceType<typeof NonConformitiesTrendStore>;
  let mockOrganizationService: {
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesResolvedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const opened = {
    metric: 'nonConformitiesOpened',
    series: [{ bucket: '2026-W28', value: 5 }],
    comparison: {},
  } as unknown as OrganizationDashboardTrendOutput;
  const resolved = {
    metric: 'nonConformitiesResolved',
    series: [{ bucket: '2026-W28', value: 3 }],
    comparison: {},
  } as unknown as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    mockOrganizationService = {
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(opened)),
      getDashboardNonConformitiesResolvedTrend: vi.fn().mockReturnValue(of(resolved)),
    };

    TestBed.configureTestingModule({
      providers: [
        NonConformitiesTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal<OrganizationOutput | null>(organization) },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(NonConformitiesTrendStore);
  });

  it('should auto-load both series over a weekly eight-week window', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        granularity: 'week',
        compare: false,
        from: expect.any(String),
        to: expect.any(String),
      }),
    );
    expect(mockOrganizationService.getDashboardNonConformitiesResolvedTrend).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ granularity: 'week', compare: false }),
    );
    expect(store.queryData()).toEqual({ opened, resolved });
  });

  it('should span roughly eight weeks between the window bounds', async () => {
    await flushEffects();

    const options = mockOrganizationService.getDashboardNonConformitiesOpenedTrend.mock
      .calls[0][1] as { from: string; to: string };
    const spanDays =
      (new Date(options.to).getTime() - new Date(options.from).getTime()) / (24 * 60 * 60 * 1000);

    expect(Math.round(spanDays)).toBe(56);
  });
});
