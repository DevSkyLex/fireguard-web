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
import { provideRouter } from '@angular/router';
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
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
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
  let setTitle: ReturnType<typeof vi.fn>;
  let selectedEquipment: WritableSignal<EquipmentOutput | null>;
  let getError: WritableSignal<StoreError | null>;
  let isLoadingEquipment: WritableSignal<boolean>;
  let resolveEquipment: ReturnType<typeof vi.fn>;
  let updateCallState: WritableSignal<CallState<EquipmentOutput | null>>;
  let isChangingLifecycle: WritableSignal<boolean>;

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
    setTitle = vi.fn();
    selectedEquipment = signal<EquipmentOutput | null>(equipment());
    getError = signal<StoreError | null>(null);
    isLoadingEquipment = signal<boolean>(false);
    resolveEquipment = vi.fn();
    updateCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());
    isChangingLifecycle = signal<boolean>(false);

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
            updateCallState,
            updateError: signal(null),
            isChangingLifecycle,
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
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
});
