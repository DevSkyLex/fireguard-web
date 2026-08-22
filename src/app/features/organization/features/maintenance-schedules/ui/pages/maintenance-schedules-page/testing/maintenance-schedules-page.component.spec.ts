import { NgTemplateOutlet } from '@angular/common';
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
import { of } from 'rxjs';
import { PageActionsService } from '@core/page-actions';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  MaintenanceCampaignOutput,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { MaintenanceSchedulesStore } from '@features/organization/features/maintenance-schedules/state';
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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
            totalSchedules: signal(1),
            isLoading: signal(false),
            hasListError: signal(false),
            isOverriding: signal(false),
            isGeneratingCampaign: signal(false),
            campaignError: signal(null),
            campaignResult,
            overrideCallState,
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
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
});
