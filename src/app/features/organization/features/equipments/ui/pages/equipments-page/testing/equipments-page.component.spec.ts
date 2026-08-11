import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import {
  idleCallState,
  successCallState,
  errorCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
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

describe('EquipmentsPage', () => {
  let fixture: ComponentFixture<EquipmentsPage>;
  let load: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let equipmentList: WritableSignal<readonly EquipmentOutput[]>;
  let listCallState: WritableSignal<CallState>;
  let hasPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    equipmentList = signal<readonly EquipmentOutput[]>([]);
    listCallState = signal<CallState>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

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
            totalEquipment: signal(0),
            isLoadingEquipment: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
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

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="equipments-new"]'),
    ).toBeNull();
  });

  it('should offer "New equipment" with the write permission', async () => {
    fixture = await createPage();

    const link: HTMLAnchorElement | null = (fixture.nativeElement as HTMLElement).querySelector(
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

  it('should keep a requested page within bounds', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](-3);
    expect(fixture.componentInstance['page']()).toBe(1);
  });
});
