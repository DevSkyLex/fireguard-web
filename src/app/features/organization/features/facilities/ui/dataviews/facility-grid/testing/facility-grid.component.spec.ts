import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityGrid } from '../facility-grid.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Headquarters',
    code: 'HQ-01',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityGrid', () => {
  let fixture: ComponentFixture<FacilityGrid>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (items: readonly FacilityOutput[], loading = false): Promise<void> => {
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'facilities']);
    await fixture.whenStable();
  };

  const openCardMenu = async (): Promise<void> => {
    root().querySelector<HTMLButtonElement>('[data-testid="facility-grid-card-menu"]')?.click();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(FacilityGrid);
  });

  it('should render one card per facility, humanizing the raw type', async () => {
    await render([facility(), facility({ id: 'facility-2', type: 'zone', name: 'Loading dock' })]);

    const cards: NodeListOf<HTMLElement> = root().querySelectorAll(
      '[data-testid="facility-grid-card"]',
    );

    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Headquarters');
    expect(cards[0].textContent).toContain('Building');
    expect(cards[1].textContent).toContain('Loading dock');
    expect(cards[1].textContent).toContain('Zone');
  });

  it('should link the card title to the facility record', async () => {
    await render([facility()]);

    const link: HTMLAnchorElement | null = root().querySelector('a');

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/facility-1');
  });

  it('should mark a facility with sub-facilities, and no other', async () => {
    await render([facility({ hasChildren: true }), facility({ id: 'facility-2' })]);

    const cards: readonly HTMLElement[] = [
      ...root().querySelectorAll<HTMLElement>('[data-testid="facility-grid-card"]'),
    ];

    expect(cards[0].querySelector('[aria-label="Has sub-facilities"]')).not.toBeNull();
    expect(cards[1].querySelector('[aria-label="Has sub-facilities"]')).toBeNull();
  });

  it('should draw skeleton cards while loading, and no data cards', async () => {
    await render([facility()], true);

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="facility-grid-card"]').length).toBe(0);
  });

  it('should say so plainly when a page holds no rows', async () => {
    await render([]);

    expect(root().querySelector('[data-testid="facility-grid-card"]')).toBeNull();
    expect(root().textContent).toContain('No results.');
  });

  it('should offer neither Archive nor Restore without the write permission', async () => {
    fixture.componentRef.setInput('canWrite', false);
    await render([facility({ status: 'active' })]);
    await openCardMenu();

    expect(document.querySelector('[data-testid="facility-grid-card-archive"]')).toBeNull();
    expect(document.querySelector('[data-testid="facility-grid-card-restore"]')).toBeNull();
  });

  it('should offer Archive for an active facility, and not Restore', async () => {
    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ status: 'active' })]);
    await openCardMenu();

    expect(document.querySelector('[data-testid="facility-grid-card-archive"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="facility-grid-card-restore"]')).toBeNull();
  });

  it('should offer Restore for an archived facility, and not Archive', async () => {
    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ status: 'archived' })]);
    await openCardMenu();

    expect(document.querySelector('[data-testid="facility-grid-card-restore"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="facility-grid-card-archive"]')).toBeNull();
  });

  it('should emit the card facility when Archive is chosen', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.archiveRequested.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ id: 'facility-9', status: 'active' })]);
    await openCardMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-grid-card-archive"]')
      ?.click();

    expect(emitted).toEqual([facility({ id: 'facility-9', status: 'active' })]);
  });

  it('should emit the card facility when Restore is chosen', async () => {
    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.restoreRequested.subscribe((value: FacilityOutput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('canWrite', true);
    await render([facility({ id: 'facility-9', status: 'archived' })]);
    await openCardMenu();
    document
      .querySelector<HTMLButtonElement>('[data-testid="facility-grid-card-restore"]')
      ?.click();

    expect(emitted).toEqual([facility({ id: 'facility-9', status: 'archived' })]);
  });
});
