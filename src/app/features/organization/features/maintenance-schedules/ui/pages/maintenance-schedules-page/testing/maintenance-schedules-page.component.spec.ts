import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService } from '@core/page-actions';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceScheduleService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  MaintenanceCampaignOutput,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceSchedulesStore } from '@features/organization/features/maintenance-schedules/state';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { MaintenanceSchedulesPage } from '../maintenance-schedules-page.component';

const createPage = async (): Promise<ComponentFixture<MaintenanceSchedulesPage>> => {
  const created: ComponentFixture<MaintenanceSchedulesPage> =
    TestBed.createComponent(MaintenanceSchedulesPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

/** Stands in for the shell's header slot, mirroring `EquipmentsPage`'s spec. */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

describe('MaintenanceSchedulesPage', () => {
  let fixture: ComponentFixture<MaintenanceSchedulesPage>;
  let load: ReturnType<typeof vi.fn>;
  let setIntervalOverride: ReturnType<typeof vi.fn>;
  let generateCampaign: ReturnType<typeof vi.fn>;
  let resetOverrideOperation: ReturnType<typeof vi.fn>;
  let resetCampaignOperation: ReturnType<typeof vi.fn>;
  let overrideCallState: WritableSignal<CallState<MaintenanceScheduleOutput>>;
  let campaignResult: WritableSignal<MaintenanceCampaignOutput | null>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let totalSchedules: WritableSignal<number>;
  let exportCsv: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let listFacilities: ReturnType<typeof vi.fn>;

  const schedule: MaintenanceScheduleOutput = {
    '@id': '/api/maintenance/schedules/schedule-1',
    '@type': 'MaintenanceSchedule',
    id: 'schedule-1',
    organization: '/api/organizations/org-1',
    equipment: '/api/equipment/equipment-1',
    equipmentType: 'fire_extinguisher',
    dueStatus: 'due_soon',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };

  beforeEach(() => {
    load = vi.fn();
    setIntervalOverride = vi.fn();
    generateCampaign = vi.fn();
    resetOverrideOperation = vi.fn();
    resetCampaignOperation = vi.fn();
    overrideCallState = signal<CallState<MaintenanceScheduleOutput>>(idleCallState());
    campaignResult = signal<MaintenanceCampaignOutput | null>(null);
    hasPermission = vi.fn().mockReturnValue(true);
    totalSchedules = signal<number>(1);
    exportCsv = vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();
    listFacilities = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal('desktop'),
            isMobileInteractionMode: signal(false),
          },
        },
        provideRouter([]),
        {
          provide: MaintenanceSchedulesStore,
          useValue: {
            load,
            setIntervalOverride,
            generateCampaign,
            resetOverrideOperation,
            resetCampaignOperation,
            schedules: signal<readonly MaintenanceScheduleOutput[]>([schedule]),
            totalSchedules,
            listCallState: signal<CallState>(successCallState(null)),
            isLoading: signal(false),
            hasListError: signal(false),
            isListForbidden: signal(false),
            isOverriding: signal(false),
            isGeneratingCampaign: signal(false),
            campaignError: signal(null),
            campaignResult,
            overrideCallState,
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
        { provide: MaintenanceScheduleService, useValue: { exportCsv } },
        { provide: FeedbackService, useValue: { warn: feedbackWarn, error: feedbackError } },
        {
          provide: FacilityService,
          useValue: { list: listFacilities },
        },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should load the list for the workspace organization IRI on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organization: '/api/organizations/org-1' });
  });

  it('should render search and forward a settled term from the first page', async () => {
    fixture = await createPage();
    load.mockClear();
    fixture.componentInstance['page'].set(3);

    fixture.componentInstance['onSearchQueryChanged']('  smoke detector  ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="maintenance-search"]'),
    ).not.toBeNull();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 1,
      search: 'smoke detector',
    });
  });

  it('should call setIntervalOverride for the opened row when the override dialog submits', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as {
        openOverrideDialog(schedule: MaintenanceScheduleOutput): void;
      }
    ).openOverrideDialog(schedule);
    (
      fixture.componentInstance as unknown as { submitOverride(value: string | null): void }
    ).submitOverride('P6M');

    expect(setIntervalOverride).toHaveBeenCalledWith({
      scheduleId: 'schedule-1',
      intervalOverride: 'P6M',
    });
  });

  it('should close the override dialog once the override succeeds', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as {
        openOverrideDialog(schedule: MaintenanceScheduleOutput): void;
      }
    ).openOverrideDialog(schedule);
    await fixture.whenStable();

    overrideCallState.set(successCallState(schedule));
    await fixture.whenStable();

    expect(
      (
        fixture.componentInstance as unknown as { overrideDialogVisible: () => boolean }
      ).overrideDialogVisible(),
    ).toBe(false);
    expect(resetOverrideOperation).toHaveBeenCalled();
  });

  it('should navigate to the created intervention once a campaign result lands', async () => {
    fixture = await createPage();

    campaignResult.set({
      '@id': '',
      '@type': 'MaintenanceCampaignResult',
      interventionId: 'intervention-1',
      number: 42,
      workItemsCount: 7,
    });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'interventions',
      'intervention-1',
    ]);
    expect(resetCampaignOperation).toHaveBeenCalled();
  });

  it('should narrow the list to the picked due-status filter', async () => {
    fixture = await createPage();
    load.mockClear();

    (
      fixture.componentInstance as unknown as {
        applyFilter(patch: { dueStatus: string | null }): void;
      }
    ).applyFilter({ dueStatus: 'due_soon' });
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(expect.objectContaining({ dueStatus: 'due_soon' }));
  });

  it('should clear the due-status narrowing when its chip is removed', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as {
        applyFilter(patch: { dueStatus: string | null }): void;
      }
    ).applyFilter({ dueStatus: 'due_soon' });
    await fixture.whenStable();
    load.mockClear();

    (fixture.componentInstance as unknown as { onFieldRemoved(key: string): void }).onFieldRemoved(
      'dueStatus',
    );
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(expect.objectContaining({ dueStatus: undefined }));
  });

  it('should convert the due-before filter to an ISO string on load', async () => {
    fixture = await createPage();
    load.mockClear();

    (
      fixture.componentInstance as unknown as {
        applyFilter(patch: { dueBefore: Date | null }): void;
      }
    ).applyFilter({ dueBefore: new Date('2026-06-30T00:00:00.000Z') });
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ dueBefore: '2026-06-30T00:00:00.000Z' }),
    );
  });

  it('should resolve a schedule facility label from the loaded organization catalog', async () => {
    listFacilities.mockReturnValue(
      of({
        member: [
          { '@id': '/api/organizations/org-1/facilities/site-1', name: 'North site' },
          { '@id': '/api/organizations/org-1/facilities/site-2', name: 'South site' },
        ],
        totalItems: 2,
      }),
    );
    fixture = await createPage();

    expect(listFacilities).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
    expect(fixture.componentInstance['tableFacilityLabelOf']('site-2')).toBe('South site');
    expect(fixture.componentInstance['tableFacilityLabelOf']('unknown')).toBeNull();
  });

  it('should remove the facility, equipment type and due-before filters independently', async () => {
    fixture = await createPage();
    fixture.componentInstance['filters'].set({
      dueStatus: 'due_soon',
      facility: '/api/organizations/org-1/facilities/site-1',
      equipmentType: 'fire_extinguisher',
      dueBefore: new Date('2026-12-31T00:00:00Z'),
    });
    await fixture.whenStable();

    fixture.componentInstance['onFieldRemoved']('facility');
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({
      facility: undefined,
      equipmentType: 'fire_extinguisher',
      dueStatus: 'due_soon',
    });

    fixture.componentInstance['onFieldRemoved']('equipmentType');
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({
      equipmentType: undefined,
      dueStatus: 'due_soon',
    });

    fixture.componentInstance['onFieldRemoved']('dueBefore');
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({
      dueBefore: undefined,
      dueStatus: 'due_soon',
    });
  });

  it('should reset pagination and all query fields when clearing filters', async () => {
    fixture = await createPage();
    fixture.componentInstance['page'].set(3);
    fixture.componentInstance['filters'].set({
      dueStatus: 'overdue',
      facility: '/api/organizations/org-1/facilities/site-1',
      equipmentType: 'fire_extinguisher',
      dueBefore: new Date('2026-12-31T00:00:00Z'),
    });
    fixture.componentInstance['searchTerm'].set('alarm');
    await fixture.whenStable();

    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0]).toEqual({
      organization: '/api/organizations/org-1',
      facility: undefined,
      equipmentType: undefined,
      dueStatus: undefined,
      dueBefore: undefined,
      search: undefined,
      page: 1,
      itemsPerPage: 30,
    });
  });

  it('should bound pagination and return to page one when the page size changes', async () => {
    totalSchedules.set(85);
    fixture = await createPage();

    fixture.componentInstance['goToPage'](99);
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({ page: 3, itemsPerPage: 30 });

    fixture.componentInstance['goToPage'](-5);
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1, itemsPerPage: 30 });

    fixture.componentInstance['setPageSize'](60);
    await fixture.whenStable();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1, itemsPerPage: 60 });
  });

  it('should scope a generated campaign and clear operation state when dismissed', async () => {
    fixture = await createPage();

    fixture.componentInstance['openCampaignDialog']();
    expect(fixture.componentInstance['campaignDialogVisible']()).toBe(true);
    expect(resetCampaignOperation).toHaveBeenCalledTimes(1);

    fixture.componentInstance['submitCampaign']({
      name: 'Winter inspection',
      dueBefore: '2026-12-31T00:00:00.000Z',
      facility: '/api/organizations/org-1/facilities/site-1',
    });
    expect(generateCampaign).toHaveBeenCalledWith({
      organization: '/api/organizations/org-1',
      name: 'Winter inspection',
      dueBefore: '2026-12-31T00:00:00.000Z',
      facility: '/api/organizations/org-1/facilities/site-1',
    });

    fixture.componentInstance['closeCampaignDialog']();
    expect(fixture.componentInstance['campaignDialogVisible']()).toBe(false);
    expect(resetCampaignOperation).toHaveBeenCalledTimes(2);
  });

  it('should ignore an override submission after its dialog has been closed', async () => {
    fixture = await createPage();
    fixture.componentInstance['openOverrideDialog'](schedule);
    fixture.componentInstance['closeOverrideDialog']();
    fixture.componentInstance['submitOverride']('P3M');

    expect(setIntervalOverride).not.toHaveBeenCalled();
    expect(resetOverrideOperation).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['overrideTarget']()).toBeNull();
  });

  it('should register the "Generate inspection campaign" action only when both permissions are held', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(
      renderPageActions().querySelector('[data-testid="maintenance-generate-campaign"]'),
    ).toBeNull();
  });

  it('should show the "Generate inspection campaign" action when both permissions are held', async () => {
    hasPermission.mockReturnValue(true);
    fixture = await createPage();

    expect(
      renderPageActions().querySelector('[data-testid="maintenance-generate-campaign"]'),
    ).not.toBeNull();
  });

  describe('export', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('should disable the button while the list is loading, busy or empty', async () => {
      totalSchedules.set(0);
      fixture = await createPage();

      expect(fixture.componentInstance['exportDisabled']()).toBe(true);

      totalSchedules.set(2);
      await fixture.whenStable();

      expect(fixture.componentInstance['exportDisabled']()).toBe(false);

      fixture.componentInstance['exportBusy'].set(true);
      expect(fixture.componentInstance['exportDisabled']()).toBe(true);
    });

    it('should forward the accepted narrowing with the organization IRI, without warning', async () => {
      fixture = await createPage();
      fixture.componentInstance['filters'].set({
        dueStatus: 'overdue',
        facility: '/api/organizations/org-1/facilities/facility-1',
        equipmentType: 'extinguisher',
        dueBefore: null,
      });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv).toHaveBeenCalledTimes(1);
      expect(exportCsv.mock.calls[0][0]).toEqual({
        organization: '/api/organizations/org-1',
        facility: '/api/organizations/org-1/facilities/facility-1',
        equipmentType: 'extinguisher',
        dueStatus: 'overdue',
      });
      expect(feedbackWarn).not.toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should forward the same dueBefore bound without dropping any active filter', async () => {
      fixture = await createPage();
      fixture.componentInstance['filters'].set({
        dueStatus: null,
        facility: null,
        equipmentType: null,
        dueBefore: new Date('2026-12-31T00:00:00Z'),
      });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).not.toHaveBeenCalled();
      expect(exportCsv.mock.calls[0][0]).toEqual({
        organization: '/api/organizations/org-1',
        facility: undefined,
        equipmentType: undefined,
        dueStatus: undefined,
        dueBefore: '2026-12-31T00:00:00.000Z',
      });
    });

    it('should clear the busy flag and surface an error toast when the export fails', async () => {
      exportCsv.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(fixture.componentInstance['exportBusy']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
