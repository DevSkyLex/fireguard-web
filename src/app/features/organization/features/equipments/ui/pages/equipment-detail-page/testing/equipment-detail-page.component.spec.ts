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
import { patchState } from '@ngrx/signals';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
  type StoreError,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { TitleService } from '@core/title';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
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
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
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
        { provide: EquipmentTypeService, useValue: { listAll: () => of([]) } },
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision: signal(0), isAuthenticated: signal(true) },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
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
            isLoadingAttachments: signal(false),
            isLoadingMaintenanceLogs: signal(false),
            attachmentsListCallState: signal(idleCallState()),
            maintenanceLogsListCallState: signal(idleCallState()),
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
          useValue: {
            openWork: () => of({ member: [], totalItems: 0 }),
            downloadAttachment: (): unknown => of(new Blob()),
            exportReport,
            inspectionSummary: () =>
              of({
                '@id': '/api/summary',
                '@type': 'EquipmentInspectionSummary',
                equipmentId: 'equipment-1',
                openAnomalies: 0,
                bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
              }),
          },
        },
        { provide: BrowserDownloadService, useValue: { trigger: downloadTrigger } },
        { provide: FeedbackService, useValue: { error: feedbackError } },
      ],
    });
  });

  it('hides a mismatched route record and rejects its next edit and lifecycle action', async () => {
    await createPage();
    fixture.componentRef.setInput('equipmentId', 'equipment-2');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="equipment-detail-info"]')).toBeNull();
    fixture.componentInstance['onEditTargetChanged']('name');
    fixture.componentInstance['onDetailsChanged']({ name: 'Wrong dossier' });
    fixture.componentInstance['confirmDecommission']();
    expect(update).not.toHaveBeenCalled();
    expect(decommission).not.toHaveBeenCalled();

    selectedEquipment.set(equipment({ id: 'equipment-2', name: 'Pump B' }));
    await fixture.whenStable();
    fixture.componentInstance['onEditTargetChanged']('name');
    fixture.componentInstance['onDetailsChanged']({ name: 'Updated B' });
    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-2',
      input: { name: 'Updated B' },
    });
    expect(setTitle).toHaveBeenLastCalledWith('Pump B');
  });

  it('should resolve the equipment title once the record lands', async () => {
    await createPage();

    expect(fixture.componentInstance['title']()).toBe('Fire extinguisher — Kidde Pro 210');
  });

  it('keeps operational status, control due status and exact open anomalies independent', async () => {
    selectedEquipment.set(equipment({ status: 'operational', maintenanceDueStatus: 'up_to_date' }));
    await createPage();
    patchState(
      fixture.componentInstance['inspectionSummaryStore'],
      setSuccessQuery({
        '@id': '/api/summary',
        '@type': 'EquipmentInspectionSummary',
        equipmentId: 'equipment-1',
        openAnomalies: 2,
        bySeverity: { low: 0, medium: 1, high: 1, critical: 0 },
      }),
    );
    await fixture.whenStable();
    const axes: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-follow-up-axes"]',
    );
    expect(axes?.textContent).toContain('Declared operational status');
    expect(axes?.textContent).toContain('Control follow-up');
    expect(axes?.textContent).toContain('Open anomalies');
    expect(axes?.querySelector('[data-testid="equipment-open-anomalies"]')?.textContent).toContain(
      '2',
    );
  });

  it('does not turn missing inspection access into a zero anomaly count', async () => {
    vi.spyOn(TestBed.inject(OrganizationPermissionService), 'hasPermission').mockImplementation(
      (permission) => permission !== ORGANIZATION_PERMISSION.INSPECTION_READ,
    );
    await createPage();
    const anomalies: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-open-anomalies"]',
    );
    expect(anomalies?.textContent).toContain('Inspection access required');
    expect(anomalies?.querySelector('[hlmBadge]')).toBeNull();
  });

  it('shows independent control and maintenance deadlines while preserving declared status and anomalies', async () => {
    selectedEquipment.set(
      equipment({
        status: 'operational',
        maintenanceDueStatus: 'up_to_date',
        controlDueStatus: 'up_to_date',
        controlNextDueAt: '2027-01-20T00:00:00+00:00',
        serviceDueStatus: 'overdue',
        serviceNextDueAt: '2026-01-10T00:00:00+00:00',
      }),
    );
    await createPage();
    patchState(
      fixture.componentInstance['inspectionSummaryStore'],
      setSuccessQuery({
        '@id': '/api/summary',
        '@type': 'EquipmentInspectionSummary',
        equipmentId: 'equipment-1',
        openAnomalies: 2,
        bySeverity: { low: 0, medium: 1, high: 1, critical: 0 },
      }),
    );
    await fixture.whenStable();
    const control: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-follow-up-axes"]',
    );
    const maintenancePanel: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-maintenance-follow-up"]',
    );
    expect(control?.textContent).toContain('Next control');
    expect(control?.textContent).not.toContain('Overdue');
    expect(maintenancePanel?.textContent).toContain('Overdue');
    expect(maintenancePanel?.textContent).toContain('Next maintenance');
    expect(selectedEquipment()?.status).toBe('operational');
    expect(
      fixture.nativeElement.querySelector('[data-testid="equipment-open-anomalies"]')?.textContent,
    ).toContain('2');
  });

  it('keeps legacy control status and an unscheduled maintenance state when new due fields are absent', async () => {
    selectedEquipment.set(equipment({ maintenanceDueStatus: 'overdue' }));
    await createPage();
    const maintenancePanel: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-maintenance-follow-up"]',
    );
    expect(maintenancePanel?.textContent).toContain('Unscheduled');
    expect(maintenancePanel?.textContent).not.toContain('Next maintenance');
    expect(
      fixture.nativeElement.querySelector('[data-testid="equipment-follow-up-axes"]')?.textContent,
    ).toContain('Overdue');
  });

  it.each([
    { timezone: 'Europe/Paris', expected: '28/02/2026' },
    { timezone: 'America/New_York', expected: '27/02/2026' },
  ])(
    'renders both deadline instants in the organization timezone $timezone',
    async ({ timezone, expected }) => {
      TestBed.overrideProvider(REGIONAL_FORMATTING_PORT, {
        useValue: {
          regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone }),
        },
      });
      selectedEquipment.set(
        equipment({
          controlDueStatus: 'due_soon',
          controlNextDueAt: '2026-02-27T23:00:00Z',
          serviceDueStatus: 'due_soon',
          serviceNextDueAt: '2026-02-27T23:00:00Z',
        }),
      );
      await createPage();

      expect(
        fixture.nativeElement.querySelector('[data-testid="equipment-follow-up-axes"]')
          ?.textContent,
      ).toContain(expected);
      expect(
        fixture.nativeElement.querySelector('[data-testid="equipment-maintenance-follow-up"]')
          ?.textContent,
      ).toContain(expected);
    },
  );

  it('reuses authorized open work for the same action before offering a new intervention', async () => {
    await createPage();
    patchState(
      fixture.componentInstance['openWorkStore'],
      setSuccessQuery([
        {
          '@id': '/api/work/task',
          '@type': 'EquipmentOpenWork',
          interventionId: 'existing-work',
          number: 41,
          name: 'Repair entrance',
          status: 'scheduled',
          workItemId: 'task',
          action: 'repair',
          workItemStatus: 'planned',
        },
      ]),
    );
    await fixture.whenStable();
    const repair = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('a')).find(
      (link) => link.textContent?.includes('Organize a repair'),
    );
    expect(repair?.getAttribute('href')).toContain('/interventions/existing-work');
    expect(repair?.getAttribute('href')).toContain('targetEquipment=equipment-1');
    expect(repair?.getAttribute('href')).not.toContain('create=1');
  });

  it('blocks new work preparation when the authorized open-work lookup fails', async () => {
    await createPage();
    patchState(
      fixture.componentInstance['openWorkStore'],
      setErrorQuery(toStoreError(new HttpErrorResponse({ status: 503 }))),
    );
    await fixture.whenStable();
    const work: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-work"]',
    );
    expect(work?.textContent).toContain('Open work is unavailable.');
    expect(work?.textContent).not.toContain('Prepare a control');
  });

  it('should show the location label beside the facility in the identity summary', async () => {
    selectedEquipment.set(
      equipment({
        facilityId: 'facility-1',
        facilityName: 'Warehouse B',
        locationLabel: 'Aisle 4',
      }),
    );
    await createPage();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="equipment-detail-location"]')?.textContent).toContain(
      'Aisle 4',
    );
  });

  it('should show no location marker when the equipment has no location label', async () => {
    selectedEquipment.set(equipment({ locationLabel: null }));
    await createPage();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="equipment-detail-location"]')).toBeNull();
  });

  it('should link to the facility even when its name could not be resolved', async () => {
    selectedEquipment.set(equipment({ facilityId: 'facility-1', facilityName: null }));
    await createPage();

    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const link: HTMLAnchorElement | null = root.querySelector(
      '[data-testid="equipment-detail-facility-link"]',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
    expect(link?.textContent).toContain('Facility deleted or unavailable');
    expect(root.textContent).not.toContain('Unassigned');
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
      expect(link?.getAttribute('href')).toBe(
        '/organizations/org-1/facilities/facility-1?tab=plans',
      );
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

  it('should confirm before decommissioning, not act on the first click', async () => {
    await createPage();

    // Decommission lives in the header's overflow menu (an irreversible action is
    // never a visible header button); the menu trigger is what the header renders.
    expect(
      renderPageActions().querySelector('[data-testid="equipment-detail-menu"]'),
    ).not.toBeNull();
    expect(renderPageActions().querySelector('[data-testid="equipment-decommission"]')).toBeNull();

    fixture.componentInstance['onDecommission']();
    await fixture.whenStable();

    expect(decommission).not.toHaveBeenCalled();
    expect(fixture.componentInstance['decommissionDialogVisible']()).toBe(true);
  });

  it('should call decommission once the confirmation is accepted', async () => {
    await createPage();

    fixture.componentInstance['confirmDecommission']();

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
