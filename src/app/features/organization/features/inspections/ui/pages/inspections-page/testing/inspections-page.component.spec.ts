import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  idleCallState,
  successCallState,
  errorCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { InspectionsPage } from '../inspections-page.component';

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<InspectionsPage>> => {
  const created: ComponentFixture<InspectionsPage> = TestBed.createComponent(InspectionsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

describe('InspectionsPage', () => {
  let fixture: ComponentFixture<InspectionsPage>;
  let load: ReturnType<typeof vi.fn>;
  let inspectionList: WritableSignal<readonly InspectionOutput[]>;
  let listCallState: WritableSignal<CallState>;
  let hasPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    inspectionList = signal<readonly InspectionOutput[]>([]);
    listCallState = signal<CallState>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: InspectionStore,
          useValue: {
            load,
            inspections: inspectionList,
            listCallState,
            totalInspections: signal(0),
            isLoadingInspections: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });
  });

  it('should load the list for the workspace on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
    expect(load.mock.calls[0][0].options).toMatchObject({ page: 1, itemsPerPage: 30, params: {} });
  });

  it('should narrow the query when a filter is picked, and return to the first page', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'draft' });
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.params).toMatchObject({ status: 'draft' });
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should never send an unset filter as an empty value', async () => {
    fixture = await createPage();

    expect(load.mock.calls[0][0].options.params).not.toHaveProperty('status');
    expect(load.mock.calls[0][0].options.params).not.toHaveProperty('result');
  });

  it('should drop every narrowing at once when filters are cleared', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ result: 'fail' });
    await fixture.whenStable();
    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.params).toEqual({});
  });

  it('should not offer "New inspection" without the write permission', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="inspections-new"]'),
    ).toBeNull();
  });

  it('should offer "New inspection" with the write permission', async () => {
    fixture = await createPage();

    const link: HTMLAnchorElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="inspections-new"]',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/inspections/create');
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
    expect(element.querySelector('[data-testid="inspections-retry"]')).not.toBeNull();

    (element.querySelector('[data-testid="inspections-retry"]') as HTMLButtonElement).click();

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state once loaded with nothing to show', async () => {
    listCallState.set(successCallState(null));
    inspectionList.set([]);
    fixture = await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No inspections found');
  });

  it('should keep a requested page within bounds', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](-3);
    expect(fixture.componentInstance['page']()).toBe(1);
  });
});
