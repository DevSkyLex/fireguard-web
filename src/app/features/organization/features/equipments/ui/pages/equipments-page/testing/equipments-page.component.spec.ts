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
import {
  idleCallState,
  successCallState,
  errorCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  EquipmentKpisStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import { EquipmentsPage } from '../equipments-page.component';

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<EquipmentsPage>> => {
  const created: ComponentFixture<EquipmentsPage> = TestBed.createComponent(EquipmentsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

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

describe('EquipmentsPage', () => {
  let fixture: ComponentFixture<EquipmentsPage>;
  let load: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let equipmentList: WritableSignal<readonly EquipmentOutput[]>;
  let listCallState: WritableSignal<CallState>;
  let totalEquipment: WritableSignal<number>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let exportCsv: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    equipmentList = signal<readonly EquipmentOutput[]>([]);
    listCallState = signal<CallState>(idleCallState());
    totalEquipment = signal<number>(0);
    hasPermission = vi.fn().mockReturnValue(true);
    exportCsv = vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: EquipmentStore,
          useValue: {
            load,
            equipmentList,
            listCallState,
            totalEquipment,
            isLoadingEquipment: signal(false),
          },
        },
        {
          provide: EquipmentKpisStore,
          useValue: {
            load: vi.fn(),
            queryData: signal(null),
            isQueryLoading: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
        { provide: EquipmentService, useValue: { exportCsv } },
        { provide: FeedbackService, useValue: { warn: feedbackWarn, error: feedbackError } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should load the list for the workspace on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
    expect(load.mock.calls[0][0].options).toMatchObject({ page: 1, itemsPerPage: 30, params: {} });
  });

  it('should send the search term as a search param', async () => {
    fixture = await createPage({ q: '  extinguisher  ' });

    expect(load.mock.calls.at(-1)?.[0].options.params).toMatchObject({ search: 'extinguisher' });
  });

  it('should narrow the query when a filter is picked, and return to the first page', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'operational' });
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.params).toMatchObject({ status: 'operational' });
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should never send an unset filter as an empty value', async () => {
    fixture = await createPage();

    expect(load.mock.calls[0][0].options.params).not.toHaveProperty('status');
    expect(load.mock.calls[0][0].options.params).not.toHaveProperty('type');
  });

  it('should drop every narrowing at once when filters are cleared', async () => {
    fixture = await createPage({ q: 'extinguisher' });

    fixture.componentInstance['applyFilter']({ type: 'fire_extinguisher' });
    await fixture.whenStable();
    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { q: null } }),
    );

    fixture.componentRef.setInput('q', undefined); // The mocked router does not round-trip the cleared query param back onto the input.
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.params).toEqual({});
  });

  it('should not offer "New equipment" without the write permission', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(renderPageActions().querySelector('[data-testid="equipments-new"]')).toBeNull();
  });

  it('should offer "New equipment" with the write permission', async () => {
    fixture = await createPage();

    const link: HTMLAnchorElement | null = renderPageActions().querySelector(
      '[data-testid="equipments-new"]',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/equipments/create');
  });

  it('should show the error state and let the operator retry', async () => {
    listCallState.set(
      errorCallState({
        error: null,
        message: 'Network down',
        code: null,
        retryable: true,
        timestamp: 0,
      }),
    );
    fixture = await createPage();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="equipments-retry"]')).not.toBeNull();

    (element.querySelector('[data-testid="equipments-retry"]') as HTMLButtonElement).click();

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state once loaded with nothing to show', async () => {
    listCallState.set(successCallState(null));
    equipmentList.set([]);
    fixture = await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No equipment found');
  });

  it('should default the ordering to createdAt/asc and toggle its direction on a re-picked field', async () => {
    fixture = await createPage();

    expect(load.mock.calls[0][0].options.sort).toEqual({ field: 'createdAt', direction: 'asc' });

    fixture.componentInstance['applySortField']('brand');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.sort).toEqual({ field: 'brand', direction: 'asc' });

    fixture.componentInstance['applySortField']('brand');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.sort).toEqual({
      field: 'brand',
      direction: 'desc',
    });
  });

  it('should return to the first page when the ordering changes', async () => {
    fixture = await createPage();

    (fixture.componentInstance['page'] as WritableSignal<number>).set(2);
    await fixture.whenStable();

    fixture.componentInstance['applySortField']('status');
    await fixture.whenStable();

    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should keep a requested page within bounds', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](-3);
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  describe('filters visibility', () => {
    function toggleButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipments-filters-toggle"]',
      );
    }

    function filterBar(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('#equipments-filter-bar');
    }

    it('should render collapsed with no badge when nothing is filtered on arrival', async () => {
      fixture = await createPage();

      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
      expect(filterBar()).toBeNull();
      expect(toggleButton()?.querySelector('hlm-badge')).toBeNull();
    });

    it('should mount the bar and show the active-filter count once the toggle is activated and a field is picked', async () => {
      fixture = await createPage();

      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();

      fixture.componentInstance['applyFilter']({
        type: 'fire_extinguisher',
        status: 'operational',
      });
      await fixture.whenStable();

      expect(toggleButton()?.querySelector('hlm-badge')?.textContent?.trim()).toBe('2');
      expect(filterBar()).not.toBeNull();
    });

    it('should unmount the bar when the toggle is activated again', async () => {
      fixture = await createPage();
      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();

      toggleButton()?.click();
      await fixture.whenStable();

      expect(filterBar()).toBeNull();
      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('export', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('should disable the button while the list is loading, busy or empty', async () => {
      totalEquipment.set(0);
      fixture = await createPage();

      expect(fixture.componentInstance['exportDisabled']()).toBe(true);

      totalEquipment.set(5);
      await fixture.whenStable();

      expect(fixture.componentInstance['exportDisabled']()).toBe(false);

      fixture.componentInstance['exportBusy'].set(true);
      expect(fixture.componentInstance['exportDisabled']()).toBe(true);
    });

    it('should request the whole-inventory export and trigger the download', async () => {
      totalEquipment.set(2);
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv).toHaveBeenCalledTimes(1);
      expect(exportCsv).toHaveBeenCalledWith('org-1');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should warn that every active filter is ignored, since the endpoint accepts none', async () => {
      totalEquipment.set(2);
      fixture = await createPage({ q: 'extinguisher' });

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).toHaveBeenCalledTimes(1);
      expect(exportCsv).toHaveBeenCalledWith('org-1');
    });

    it('should not warn when no filter or search is active', async () => {
      totalEquipment.set(2);
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(feedbackWarn).not.toHaveBeenCalled();
    });

    it('should clear the busy flag and surface an error toast when the export fails', async () => {
      totalEquipment.set(2);
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
