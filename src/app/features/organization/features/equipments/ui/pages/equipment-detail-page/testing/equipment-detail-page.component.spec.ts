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
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentAttachmentOutput,
  EquipmentOutput,
  EquipmentTagOutput,
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { EquipmentDetailPage } from '../equipment-detail-page.component';

const equipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput =>
  ({
    '@id': '/api/organizations/org-1/equipment/equipment-1',
    '@type': 'Equipment',
    id: 'equipment-1',
    organizationId: 'org-1',
    facilityId: null,
    facilityName: null,
    type: 'fire_extinguisher',
    subType: null,
    brand: 'Kidde',
    model: 'Pro 210',
    serialNumber: null,
    locationLabel: null,
    status: 'in_stock',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as EquipmentOutput;

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

describe('EquipmentDetailPage', () => {
  let fixture: ComponentFixture<EquipmentDetailPage>;
  let update: ReturnType<typeof vi.fn>;
  let commission: ReturnType<typeof vi.fn>;
  let maintenance: ReturnType<typeof vi.fn>;
  let decommission: ReturnType<typeof vi.fn>;
  let loadAttachments: ReturnType<typeof vi.fn>;
  let loadMaintenanceLogs: ReturnType<typeof vi.fn>;
  let loadTags: ReturnType<typeof vi.fn>;
  let addAttachment: ReturnType<typeof vi.fn>;
  let deleteAttachment: ReturnType<typeof vi.fn>;
  let addTag: ReturnType<typeof vi.fn>;
  let removeTag: ReturnType<typeof vi.fn>;
  let assignToFacility: ReturnType<typeof vi.fn>;
  let unassignFromFacility: ReturnType<typeof vi.fn>;
  let setTitle: ReturnType<typeof vi.fn>;
  let selectedEquipment: WritableSignal<EquipmentOutput | null>;
  let getError: WritableSignal<StoreError | null>;
  let isLoadingEquipment: WritableSignal<boolean>;
  let resolveEquipment: ReturnType<typeof vi.fn>;
  let updateCallState: WritableSignal<CallState<EquipmentOutput | null>>;
  let assignToFacilityCallState: WritableSignal<CallState<EquipmentOutput | null>>;
  let unassignFromFacilityCallState: WritableSignal<CallState<EquipmentOutput | null>>;
  let isChangingLifecycle: WritableSignal<boolean>;
  let exportReport: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let downloadTrigger: ReturnType<typeof vi.fn>;

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('equipmentId', 'equipment-1');
    await fixture.whenStable();
  };

  beforeEach(() => {
    update = vi.fn();
    commission = vi.fn();
    maintenance = vi.fn();
    decommission = vi.fn();
    loadAttachments = vi.fn();
    loadMaintenanceLogs = vi.fn();
    loadTags = vi.fn();
    addAttachment = vi.fn();
    deleteAttachment = vi.fn();
    addTag = vi.fn();
    removeTag = vi.fn();
    assignToFacility = vi.fn();
    unassignFromFacility = vi.fn();
    setTitle = vi.fn();
    selectedEquipment = signal<EquipmentOutput | null>(equipment());
    getError = signal<StoreError | null>(null);
    isLoadingEquipment = signal<boolean>(false);
    resolveEquipment = vi.fn();
    updateCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());
    assignToFacilityCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());
    unassignFromFacilityCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());
    isChangingLifecycle = signal<boolean>(false);
    exportReport = vi.fn().mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    feedbackError = vi.fn();
    downloadTrigger = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActiveEquipmentStore,
          useValue: { selectedEquipment, getError, isLoadingEquipment, resolveEquipment },
        },
        { provide: TitleService, useValue: { setTitle } },
        {
          provide: EquipmentStore,
          useValue: {
            update,
            commission,
            maintenance,
            decommission,
            loadAttachments,
            loadMaintenanceLogs,
            loadTags,
            addAttachment,
            deleteAttachment,
            addTag,
            removeTag,
            assignToFacility,
            unassignFromFacility,
            updateCallState,
            updateError: signal(null),
            isChangingLifecycle,
            attachments: signal<readonly EquipmentAttachmentOutput[]>([]),
            tags: signal<readonly EquipmentTagOutput[]>([]),
            maintenanceLogs: signal([]),
            isLoadingTags: signal(false),
            isLoadingMaintenanceLogs: signal(false),
            addAttachmentCallState: signal(idleCallState()),
            addTagCallState: signal(idleCallState()),
            deleteAttachmentCallState: signal(idleCallState()),
            removeTagCallState: signal(idleCallState()),
            assignToFacilityCallState,
            unassignFromFacilityCallState,
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
        {
          provide: FacilityService,
          useValue: { list: (): unknown => of({ member: [], totalItems: 0 }) },
        },
        {
          provide: EquipmentService,
          useValue: { downloadAttachment: (): unknown => of(new Blob()), exportReport },
        },
        { provide: BrowserDownloadService, useValue: { trigger: downloadTrigger } },
        { provide: FeedbackService, useValue: { error: feedbackError } },
      ],
    });
  });

  it('should resolve the equipment title once the record lands', async () => {
    await createPage();

    expect(fixture.componentInstance['title']()).toBe('Fire extinguisher — Kidde Pro 210');
  });

  describe('pinned on plan indicator', () => {
    it('should show nothing when the equipment has no plan position', async () => {
      await createPage();

      const root: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="equipment-detail-pinned"]')).toBeNull();
    });

    it('should link to the owning facility when a plan position is set', async () => {
      selectedEquipment.set(
        equipment({
          facilityId: 'facility-1',
          planPosition: { attachmentId: 'plan-1', x: 0.4, y: 0.6 },
        }),
      );
      await createPage();

      const root: HTMLElement = fixture.nativeElement as HTMLElement;
      const link: HTMLAnchorElement | null = root.querySelector(
        '[data-testid="equipment-detail-pinned"]',
      );
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
    });

    it('should not show the indicator when pinned but unassigned from any facility', async () => {
      selectedEquipment.set(
        equipment({
          facilityId: null,
          planPosition: { attachmentId: 'plan-1', x: 0.4, y: 0.6 },
        }),
      );
      await createPage();

      const root: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="equipment-detail-pinned"]')).toBeNull();
    });
  });

  it('should show a loading state before the equipment resolves', async () => {
    selectedEquipment.set(null);
    isLoadingEquipment.set(true);
    await createPage();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();
  });

  it('should re-set the document title once the equipment resolves', async () => {
    selectedEquipment.set(null);
    await createPage();

    expect(setTitle).not.toHaveBeenCalled();

    selectedEquipment.set(equipment());
    await fixture.whenStable();

    expect(setTitle).toHaveBeenCalledWith('Fire extinguisher — Kidde Pro 210');
  });

  it('should show the load-failed state with a retry when the load fails', async () => {
    selectedEquipment.set(null);
    getError.set({ error: null, message: 'down', code: 500, retryable: false, timestamp: 0 });
    await createPage();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="equipment-detail-load-failed"]')).not.toBeNull();

    root
      .querySelector<HTMLButtonElement>('[data-testid="equipment-detail-retry"]')
      ?.dispatchEvent(new MouseEvent('click'));

    expect(resolveEquipment).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
    });
  });

  it.each([
    ['in_stock', 'Commission'],
    ['under_maintenance', 'Resume service'],
    ['operational', 'Maintenance'],
  ])('should offer %s as the primary action for status %s', async (status, label) => {
    selectedEquipment.set(equipment({ status: status as EquipmentOutput['status'] }));
    await createPage();

    expect(
      renderPageActions().querySelector('[data-testid="equipment-primary-action"]')?.textContent,
    ).toContain(label);
  });

  it('should offer no primary action once decommissioned', async () => {
    selectedEquipment.set(equipment({ status: 'decommissioned' }));
    await createPage();

    expect(
      renderPageActions().querySelector('[data-testid="equipment-primary-action"]'),
    ).toBeNull();
  });

  it('should not offer Decommission once already decommissioned', async () => {
    selectedEquipment.set(equipment({ status: 'decommissioned' }));
    await createPage();

    expect(renderPageActions().querySelector('[data-testid="equipment-decommission"]')).toBeNull();
  });

  it('should call commission when the primary action is taken from in_stock', async () => {
    await createPage();

    (
      renderPageActions().querySelector(
        '[data-testid="equipment-primary-action"]',
      ) as HTMLButtonElement
    ).click();

    expect(commission).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
    });
  });

  it('should call decommission when the secondary action is taken', async () => {
    await createPage();

    (
      renderPageActions().querySelector(
        '[data-testid="equipment-decommission"]',
      ) as HTMLButtonElement
    ).click();

    expect(decommission).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
    });
  });

  it('should refuse a lifecycle action while another one is already in flight', async () => {
    isChangingLifecycle.set(true);
    await createPage();

    fixture.componentInstance['onDecommission']();

    expect(decommission).not.toHaveBeenCalled();
  });

  it('should send an in-place patch for the currently open field', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });

    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
      input: { brand: 'Amerex' },
    });
  });

  it('should close the field once its write succeeds', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });
    updateCallState.set(successCallState(equipment({ brand: 'Amerex' })));
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

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });
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
      open: 'brand',
      saving: null,
      failed: 'brand',
      failure: 'Rejected',
    });
  });

  describe('tab activation', () => {
    it('should load attachments only once, on first activation of the Attachments tab', async () => {
      await createPage();

      fixture.componentInstance['onTabActivated']('attachments');
      fixture.componentInstance['onTabActivated']('overview');
      fixture.componentInstance['onTabActivated']('attachments');

      expect(loadAttachments).toHaveBeenCalledTimes(1);
      expect(loadAttachments).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
      });
    });

    it('should load maintenance logs on first activation of the Maintenance tab', async () => {
      await createPage();

      fixture.componentInstance['onTabActivated']('maintenance');

      expect(loadMaintenanceLogs).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
      });
    });

    it('should load the tag catalog on first activation of the Tags tab', async () => {
      await createPage();

      fixture.componentInstance['onTabActivated']('tags');

      expect(loadTags).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });
  });

  describe('attachments', () => {
    const attachment: EquipmentAttachmentOutput = {
      '@id': '/api/organizations/org-1/equipment/equipment-1/attachments/attachment-1',
      '@type': 'EquipmentAttachment',
      id: 'attachment-1',
      revision: 1,
      equipmentId: 'equipment-1',
      fileName: 'datasheet.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      label: null,
      uploadedAt: '2026-01-05T09:00:00Z',
    };

    it('should convert a picked file to base64 and call addAttachment', async () => {
      await createPage();

      const file: File = new File(['hello'], 'note.txt', { type: 'text/plain' });
      fixture.componentInstance['onAttachmentFilesPicked']([file]);
      await vi.waitFor(() => expect(addAttachment).toHaveBeenCalled());

      expect(addAttachment).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: { fileName: 'note.txt', content: btoa('hello'), mimeType: 'text/plain' },
      });
    });

    it('should call deleteAttachment for the given attachment', async () => {
      await createPage();

      fixture.componentInstance['onAttachmentDeleteRequested'](attachment);

      expect(deleteAttachment).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        attachmentId: 'attachment-1',
      });
    });

    it('should mark the row pending while its delete is in flight, so the control announces busy', async () => {
      await createPage();

      fixture.componentInstance['onAttachmentDeleteRequested'](attachment);

      expect(fixture.componentInstance['pendingAttachmentDeleteIds']().has('attachment-1')).toBe(
        true,
      );
    });
  });

  describe('tags', () => {
    it('should call addTag with the requested name', async () => {
      await createPage();

      fixture.componentInstance['onTagAddRequested']('critical');

      expect(addTag).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: { name: 'critical' },
      });
    });

    it('should call removeTag for the given tag', async () => {
      await createPage();

      const tag: EquipmentTagOutput = {
        '@id': '/api/organizations/org-1/equipment/tags/tag-1',
        '@type': 'EquipmentTag',
        id: 'tag-1',
        name: 'critical',
        organizationId: 'org-1',
      };
      fixture.componentInstance['onTagRemoveRequested'](tag);

      expect(removeTag).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        tagId: 'tag-1',
      });
    });
  });

  describe('facility assignment', () => {
    it('should call assignToFacility with the picked facility', async () => {
      await createPage();

      fixture.componentInstance['onFacilityAssigned']('facility-2');

      expect(assignToFacility).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        input: { facilityId: 'facility-2' },
      });
    });

    it('should call unassignFromFacility', async () => {
      await createPage();

      fixture.componentInstance['onFacilityUnassigned']();

      expect(unassignFromFacility).toHaveBeenCalledWith({
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
      });
    });

    it('should close the dialog once the assignment succeeds', async () => {
      await createPage();

      fixture.componentInstance['assignFacilityDialogVisible'].set(true);
      assignToFacilityCallState.set(successCallState(equipment({ facilityId: 'facility-2' })));
      await fixture.whenStable();

      expect(fixture.componentInstance['assignFacilityDialogVisible']()).toBe(false);
    });
  });

  describe('equipment sheet export', () => {
    it('renders the header button and downloads the PDF sheet on click', async () => {
      await createPage();

      const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '[data-testid="equipment-detail-export-report"]',
      );
      expect(button).not.toBeNull();

      button?.click();
      await fixture.whenStable();

      expect(exportReport).toHaveBeenCalledTimes(1);
      expect(exportReport).toHaveBeenCalledWith('org-1', 'equipment-1');
      expect(downloadTrigger).toHaveBeenCalledWith(
        expect.any(Blob),
        'equipment-equipment-1-sheet.pdf',
      );
      expect(fixture.componentInstance['reportExporting']()).toBe(false);
    });

    it('surfaces the blob-wrapped RFC 7807 detail in the error toast on a 403', async () => {
      exportReport.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: new Blob(
                [JSON.stringify({ '@type': 'Error', status: 403, detail: 'Plan not entitled' })],
                { type: 'application/json' },
              ),
            }),
        ),
      );
      await createPage();

      fixture.componentInstance['exportReport']();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));

      expect(fixture.componentInstance['reportExporting']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledWith('Plan not entitled');
      expect(downloadTrigger).not.toHaveBeenCalled();
    });
  });
});
