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
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
} from '@features/organization/features/inspections/state';
import { InspectionDetailPage } from '../inspection-detail-page.component';

const inspection = (overrides: Partial<InspectionOutput> = {}): InspectionOutput =>
  ({
    '@id': '/api/organizations/org-1/inspections/inspection-1',
    '@type': 'Inspection',
    id: 'inspection-1',
    organizationId: 'org-1',
    equipmentId: 'equipment-1',
    facilityId: null,
    result: 'pass',
    status: 'draft',
    performedAt: '2026-08-10T00:00:00Z',
    inspector: null,
    checklistId: null,
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    ...overrides,
  }) as InspectionOutput;

/**
 * Stands in for the shell's `DashboardPageActions` — see `InterventionsPage`'s
 * spec for the approach every migrated page's spec reuses.
 */
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

describe('InspectionDetailPage', () => {
  let fixture: ComponentFixture<InspectionDetailPage>;
  let update: ReturnType<typeof vi.fn>;
  let submit: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let setTitle: ReturnType<typeof vi.fn>;
  let selectedInspection: WritableSignal<InspectionOutput | null>;
  let getError: WritableSignal<StoreError | null>;
  let isLoadingInspection: WritableSignal<boolean>;
  let resolveInspection: ReturnType<typeof vi.fn>;
  let updateCallState: WritableSignal<CallState<InspectionOutput | null>>;
  let cancelCallState: WritableSignal<CallState<string | null>>;
  let isChangingLifecycle: WritableSignal<boolean>;
  let loadNonConformities: ReturnType<typeof vi.fn>;
  let addNonConformity: ReturnType<typeof vi.fn>;
  let updateNonConformityStatus: ReturnType<typeof vi.fn>;
  let resetAddNonConformityOperation: ReturnType<typeof vi.fn>;
  let nonConformitiesListCallState: WritableSignal<CallState>;
  let addNonConformityCallState: WritableSignal<CallState<NonConformityOutput | null>>;
  let isUpdatingNonConformity: WritableSignal<boolean>;
  let checklistGet: ReturnType<typeof vi.fn>;
  let exportNonConformitiesCsv: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(InspectionDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('inspectionId', 'inspection-1');
    await fixture.whenStable();
  };

  beforeEach(() => {
    update = vi.fn();
    submit = vi.fn();
    close = vi.fn();
    cancel = vi.fn();
    setTitle = vi.fn();
    selectedInspection = signal<InspectionOutput | null>(inspection());
    getError = signal<StoreError | null>(null);
    isLoadingInspection = signal<boolean>(false);
    resolveInspection = vi.fn();
    updateCallState = signal<CallState<InspectionOutput | null>>(idleCallState());
    cancelCallState = signal<CallState<string | null>>(idleCallState());
    isChangingLifecycle = signal<boolean>(false);
    loadNonConformities = vi.fn();
    addNonConformity = vi.fn();
    updateNonConformityStatus = vi.fn();
    resetAddNonConformityOperation = vi.fn();
    nonConformitiesListCallState = signal<CallState>(idleCallState());
    addNonConformityCallState = signal<CallState<NonConformityOutput | null>>(idleCallState());
    isUpdatingNonConformity = signal<boolean>(false);
    checklistGet = vi.fn().mockReturnValue(
      of({
        id: 'checklist-1',
        name: 'Monthly fire panel check',
      } as unknown as ChecklistOutput),
    );
    exportNonConformitiesCsv = vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActiveInspectionStore,
          useValue: { selectedInspection, getError, isLoadingInspection, resolveInspection },
        },
        { provide: TitleService, useValue: { setTitle } },
        {
          provide: InspectionStore,
          useValue: {
            update,
            submit,
            close,
            cancel,
            updateCallState,
            cancelCallState,
            updateError: signal(null),
            isChangingLifecycle,
            loadNonConformities,
            addNonConformity,
            updateNonConformityStatus,
            resetAddNonConformityOperation,
            nonConformities: signal<ReadonlyArray<NonConformityOutput>>([]),
            nonConformityWaivePending: signal({}),
            nonConformitiesListCallState,
            addNonConformityCallState,
            isLoadingNonConformities: signal<boolean>(false),
            isAddingNonConformity: signal<boolean>(false),
            isUpdatingNonConformity,
            nonConformityStatusErrorText: signal<string | null>(null),
            nonConformityStatusErrorId: signal<string | null>(null),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
        { provide: ChecklistService, useValue: { get: checklistGet } },
        { provide: InspectionService, useValue: { exportNonConformitiesCsv } },
        { provide: FeedbackService, useValue: { warn: feedbackWarn, error: feedbackError } },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should resolve the inspection title once the record lands', async () => {
    await createPage();

    expect(fixture.componentInstance['title']()).toBe('Inspection 2026-08-10');
  });

  it('should show a loading state before the inspection resolves', async () => {
    selectedInspection.set(null);
    isLoadingInspection.set(true);
    await createPage();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();
  });

  it('should re-set the document title once the inspection resolves', async () => {
    selectedInspection.set(null);
    await createPage();

    expect(setTitle).not.toHaveBeenCalled();

    selectedInspection.set(inspection());
    await fixture.whenStable();

    expect(setTitle).toHaveBeenCalledWith('Inspection 2026-08-10');
  });

  it('should show the load-failed state with a retry when the load fails', async () => {
    selectedInspection.set(null);
    getError.set({ error: null, message: 'down', code: 500, retryable: false, timestamp: 0 });
    await createPage();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="inspection-detail-load-failed"]')).not.toBeNull();

    root
      .querySelector<HTMLButtonElement>('[data-testid="inspection-detail-retry"]')
      ?.dispatchEvent(new MouseEvent('click'));

    expect(resolveInspection).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: 'inspection-1',
    });
  });

  it('should offer Submit and Cancel while draft', async () => {
    await createPage();

    const header: HTMLElement = renderPageActions();
    expect(header.querySelector('[data-testid="inspection-submit"]')).not.toBeNull();
    expect(header.querySelector('[data-testid="inspection-cancel"]')).not.toBeNull();
    expect(header.querySelector('[data-testid="inspection-close"]')).toBeNull();
  });

  it('should offer only Close while submitted', async () => {
    selectedInspection.set(inspection({ status: 'submitted' }));
    await createPage();

    const header: HTMLElement = renderPageActions();
    expect(header.querySelector('[data-testid="inspection-close"]')).not.toBeNull();
    expect(header.querySelector('[data-testid="inspection-submit"]')).toBeNull();
    expect(header.querySelector('[data-testid="inspection-cancel"]')).toBeNull();
  });

  it('should offer no lifecycle action once closed', async () => {
    selectedInspection.set(inspection({ status: 'closed' }));
    await createPage();

    expect(
      renderPageActions()
        .querySelector('[data-testid="inspection-lifecycle-band"]')
        ?.textContent?.trim(),
    ).toBe('');
  });

  describe('checklist name resolution', () => {
    it('should not fetch a checklist name when the inspection has none', async () => {
      await createPage();

      expect(checklistGet).not.toHaveBeenCalled();
      expect(fixture.componentInstance['checklistName']()).toBeNull();
    });

    it('should resolve and expose the checklist name once the record carries a checklistId', async () => {
      selectedInspection.set(inspection({ checklistId: 'checklist-1' }));
      await createPage();

      expect(checklistGet).toHaveBeenCalledWith('org-1', 'checklist-1');
      expect(fixture.componentInstance['checklistName']()).toBe('Monthly fire panel check');
    });

    it('should not re-fetch the same checklist id twice', async () => {
      selectedInspection.set(inspection({ checklistId: 'checklist-1' }));
      await createPage();

      selectedInspection.set(inspection({ checklistId: 'checklist-1' }));
      await fixture.whenStable();

      expect(checklistGet).toHaveBeenCalledTimes(1);
    });

    it('should leave the checklist name null when it could not be resolved', async () => {
      checklistGet.mockReturnValue(throwError(() => new Error('not found')));
      selectedInspection.set(inspection({ checklistId: 'checklist-1' }));
      await createPage();

      expect(fixture.componentInstance['checklistName']()).toBeNull();
    });
  });

  it('should gate the in-place fields to a draft inspection', async () => {
    selectedInspection.set(inspection({ status: 'submitted' }));
    await createPage();

    expect(fixture.componentInstance['canEditFields']()).toBe(false);
  });

  it('should call submit when the Submit action is taken', async () => {
    await createPage();

    fixture.componentInstance['onSubmit']();

    expect(submit).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: 'inspection-1',
    });
  });

  it('should refuse a lifecycle action while another one is already in flight', async () => {
    isChangingLifecycle.set(true);
    await createPage();

    fixture.componentInstance['onSubmit']();

    expect(submit).not.toHaveBeenCalled();
  });

  it('should send the cancel write once confirmed', async () => {
    await createPage();

    fixture.componentInstance['requestCancel']();
    fixture.componentInstance['confirmCancel']();

    expect(cancel).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: 'inspection-1',
    });
  });

  it('should return to the list once the cancellation succeeds', async () => {
    await createPage();

    cancelCallState.set(successCallState('inspection-1'));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'inspections']);
  });

  it('should send an in-place patch for the currently open field', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('notes');
    fixture.componentInstance['onDetailsChanged']({ notes: 'Looks fine' });

    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      inspectionId: 'inspection-1',
      input: { notes: 'Looks fine' },
    });
  });

  it('should close the field once its write succeeds', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('notes');
    fixture.componentInstance['onDetailsChanged']({ notes: 'Looks fine' });
    updateCallState.set(successCallState(inspection({ notes: 'Looks fine' })));
    await fixture.whenStable();

    expect(fixture.componentInstance['editState']()).toEqual({
      open: null,
      saving: null,
      failed: null,
      failure: null,
    });
  });

  it('should attribute a rejection to the field that caused it, and keep it open', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('notes');
    fixture.componentInstance['onDetailsChanged']({ notes: 'Looks fine' });
    updateCallState.set(
      errorCallState({
        error: null,
        message: 'Rejected',
        code: 422,
        retryable: false,
        timestamp: 0,
      }),
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['editState']()).toEqual({
      open: 'notes',
      saving: null,
      failed: 'notes',
      failure: 'Rejected',
    });
  });

  describe('non-conformities section', () => {
    it('should load non-conformities only on the first expansion', async () => {
      await createPage();

      fixture.componentInstance['toggleNonConformities']();
      nonConformitiesListCallState.set(pendingCallState());
      fixture.componentInstance['toggleNonConformities']();
      fixture.componentInstance['toggleNonConformities']();

      expect(loadNonConformities).toHaveBeenCalledTimes(1);
      expect(loadNonConformities).toHaveBeenCalledWith({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
      });
    });

    it('should not reload non-conformities on a later expansion once already loaded', async () => {
      nonConformitiesListCallState.set(successCallState(null));
      await createPage();

      fixture.componentInstance['toggleNonConformities']();

      expect(loadNonConformities).not.toHaveBeenCalled();
    });

    it('should hide the add entry point once the inspection is closed even for a writer', async () => {
      selectedInspection.set(inspection({ status: 'closed' }));
      await createPage();

      expect(fixture.componentInstance['canAddNonConformity']()).toBe(false);
    });

    it('should allow adding on a non-closed inspection for a writer', async () => {
      selectedInspection.set(inspection({ status: 'submitted' }));
      await createPage();

      expect(fixture.componentInstance['canAddNonConformity']()).toBe(true);
    });

    it('should reset the add operation and open the dialog', async () => {
      await createPage();

      fixture.componentInstance['openAddNonConformityDialog']();

      expect(resetAddNonConformityOperation).toHaveBeenCalled();
      expect(fixture.componentInstance['addNonConformityDialogOpen']()).toBe(true);
    });

    it('should close the add dialog once the add succeeds', async () => {
      await createPage();
      fixture.componentInstance['openAddNonConformityDialog']();

      addNonConformityCallState.set(
        successCallState({ id: 'nc-1' } as unknown as NonConformityOutput),
      );
      await fixture.whenStable();

      expect(fixture.componentInstance['addNonConformityDialogOpen']()).toBe(false);
    });

    it('should send the add payload with the route ids folded in', async () => {
      await createPage();

      fixture.componentInstance['onNonConformityAdded']({
        description: 'Gauge in the red',
        severity: 'high',
      });

      expect(addNonConformity).toHaveBeenCalledWith({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        input: { description: 'Gauge in the red', severity: 'high' },
      });
    });

    it('should send a status write with the row and route ids', async () => {
      await createPage();

      fixture.componentInstance['onNonConformityStatusPicked']({
        nonConformityId: 'nc-1',
        status: 'in_progress',
      });

      expect(updateNonConformityStatus).toHaveBeenCalledWith({
        organizationId: 'org-1',
        inspectionId: 'inspection-1',
        nonConformityId: 'nc-1',
        input: { status: 'in_progress' },
      });
      expect(fixture.componentInstance['pendingNonConformityId']()).toBe('nc-1');
    });

    it('should refuse a second status write while one is already in flight', async () => {
      isUpdatingNonConformity.set(true);
      await createPage();

      fixture.componentInstance['onNonConformityStatusPicked']({
        nonConformityId: 'nc-1',
        status: 'in_progress',
      });

      expect(updateNonConformityStatus).not.toHaveBeenCalled();
    });

    it('should clear the pending id once the status write settles', async () => {
      await createPage();

      fixture.componentInstance['onNonConformityStatusPicked']({
        nonConformityId: 'nc-1',
        status: 'in_progress',
      });
      expect(fixture.componentInstance['pendingNonConformityId']()).toBe('nc-1');

      isUpdatingNonConformity.set(true);
      await fixture.whenStable();
      isUpdatingNonConformity.set(false);
      await fixture.whenStable();

      expect(fixture.componentInstance['pendingNonConformityId']()).toBeNull();
    });
  });

  describe('non-conformities export', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('should always warn that the export covers the whole organization, then trigger the download', async () => {
      await createPage();

      fixture.componentInstance['exportNonConformitiesCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).toHaveBeenCalledTimes(1);
      expect(exportNonConformitiesCsv).toHaveBeenCalledTimes(1);
      expect(exportNonConformitiesCsv).toHaveBeenCalledWith('org-1');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should disable the button while an export is in flight', async () => {
      await createPage();

      expect(fixture.componentInstance['exportDisabled']()).toBe(false);

      fixture.componentInstance['exportBusy'].set(true);
      expect(fixture.componentInstance['exportDisabled']()).toBe(true);
    });

    it('should clear the busy flag and surface an error toast when the export fails', async () => {
      exportNonConformitiesCsv.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 0 })),
      );
      await createPage();

      fixture.componentInstance['exportNonConformitiesCsv']();
      await fixture.whenStable();

      expect(fixture.componentInstance['exportBusy']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
