import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { THEME_PORT } from '@core/theme';
import { FacilityService } from '@features/organization/features/facilities';
import type { FacilityOutput } from '@features/organization/features/facilities';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationMapPage } from '../organization-map.component';

const facility = (id: string, name: string, type: string, placed = true): FacilityOutput =>
  ({
    id,
    name,
    type,
    status: 'active',
    latitude: placed ? 48.85 : null,
    longitude: placed ? 2.35 : null,
  }) as unknown as FacilityOutput;

const FACILITIES: readonly FacilityOutput[] = [
  facility('f1', 'Acme HQ', 'office'),
  facility('f2', 'North Depot', 'warehouse'),
  facility('f3', 'Unplaced Annex', 'office', false),
];

const at = (fixture: ComponentFixture<OrganizationMapPage>, testId: string): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

const items = (fixture: ComponentFixture<OrganizationMapPage>): string[] =>
  [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="map-panel-item"]'),
  ].map((node: Element): string => node.textContent?.trim() ?? '');

describe('OrganizationMapPage', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };

  const render = (): ComponentFixture<OrganizationMapPage> => {
    router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: ENV_CONFIG, useValue: { mapStyleUrl: 'https://example.invalid/s' } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: FacilityService, useValue: { listAll: () => of(FACILITIES) } },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
      ],
    });

    const fixture = TestBed.createComponent(OrganizationMapPage);
    fixture.detectChanges();
    return fixture;
  };

  /**
   * The panel and the map must describe the same set. A row with no pin cannot
   * be selected from the map, and would make the count disagree with what is
   * plotted.
   */
  it('lists only the facilities the map can plot', () => {
    const fixture = render();

    expect(items(fixture)).toHaveLength(2);
    expect(items(fixture).join(' ')).not.toContain('Unplaced Annex');
  });

  it('counts the listed sites', () => {
    expect(at(render(), 'map-panel-count')?.textContent).toContain('2 sites');
  });

  it('filters on name and on type', () => {
    const fixture = render();
    const component = fixture.componentInstance as unknown as {
      search: { set(value: string): void };
    };

    component.search.set('depot');
    fixture.detectChanges();
    expect(items(fixture)).toHaveLength(1);

    component.search.set('office');
    fixture.detectChanges();
    expect(items(fixture)).toHaveLength(1);
  });

  it('distinguishes "no match" from "no facilities"', () => {
    const fixture = render();
    (fixture.componentInstance as unknown as { search: { set(value: string): void } }).search.set(
      'nothing matches this',
    );
    fixture.detectChanges();

    expect(at(fixture, 'map-panel-no-match')).not.toBeNull();
  });

  /**
   * Selecting used to navigate straight to the record, which defeats the point
   * of plotting sites together — you left the map on the first click.
   */
  it('selects a site without leaving the map', () => {
    const fixture = render();

    at(fixture, 'map-panel-item')?.click();
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(at(fixture, 'map-panel-open')).not.toBeNull();
  });

  it('opens the record only through the explicit action', () => {
    const fixture = render();
    at(fixture, 'map-panel-item')?.click();
    fixture.detectChanges();

    at(fixture, 'map-panel-open')?.querySelector('button')?.click();

    expect(router.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'f1']);
  });
});
