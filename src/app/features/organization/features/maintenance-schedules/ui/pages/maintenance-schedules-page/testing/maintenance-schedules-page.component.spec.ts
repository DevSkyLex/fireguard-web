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
import { PageActionsService } from '@core/page-actions';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
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
          useValue: { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) },
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

    it('should warn that the dueBefore bound is not exportable and leave it out', async () => {
      fixture = await createPage();
      fixture.componentInstance['filters'].set({
        dueStatus: null,
        facility: null,
        equipmentType: null,
        dueBefore: new Date('2026-12-31T00:00:00Z'),
      });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).toHaveBeenCalledTimes(1);
      expect(exportCsv.mock.calls[0][0]).toEqual({
        organization: '/api/organizations/org-1',
        facility: undefined,
        equipmentType: undefined,
        dueStatus: undefined,
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
