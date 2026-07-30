import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { FacilityInstallationsPanel } from '../facility-installations-panel.component';

const facility = (overrides: Partial<FacilityOutput>): FacilityOutput =>
  ({
    id: 'fac-root',
    name: 'Headquarters',
    type: 'site',
    status: 'active',
    code: null,
    hasChildren: false,
    parentFacilityId: null,
    ...overrides,
  }) as unknown as FacilityOutput;

describe('FacilityInstallationsPanel', () => {
  const createFixture = (
    childFacilitiesByParent: Readonly<Record<string, ReadonlyArray<FacilityOutput>>>,
    facilityInput: FacilityOutput = facility({ id: 'fac-root' }),
  ) => {
    TestBed.configureTestingModule({
      imports: [FacilityInstallationsPanel],
      providers: [
        {
          provide: FacilityStore,
          useValue: { childFacilitiesByParent: signal(childFacilitiesByParent) },
        },
      ],
    });
    const fixture = TestBed.createComponent(FacilityInstallationsPanel);
    fixture.componentRef.setInput('facility', facilityInput);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the root facility with its status and type icon', () => {
    const fixture = createFixture({});

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Headquarters');
    expect(host.querySelector('p-tag')).toBeTruthy();
  });

  it('should render the empty state when there are no loaded children', () => {
    const fixture = createFixture({});

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No child installation loaded.');
  });

  it('should render direct children sorted alphabetically', () => {
    const fixture = createFixture({
      'fac-root': [
        facility({ id: 'fac-b', name: 'Zone B' }),
        facility({ id: 'fac-a', name: 'Zone A' }),
      ],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const names = Array.from(host.querySelectorAll('ul > li > button span span')).map((el) =>
      el.textContent?.trim(),
    );
    expect(names.indexOf('Zone A')).toBeLessThan(names.indexOf('Zone B'));
  });

  it('should render grandchildren nested under their direct-child parent', () => {
    const fixture = createFixture({
      'fac-root': [facility({ id: 'fac-child', name: 'Building A' })],
      'fac-child': [facility({ id: 'fac-grandchild', name: 'Floor 1' })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Building A');
    expect(host.textContent).toContain('Floor 1');
  });

  it('should compute the total installation count including the root and all descendants', () => {
    const fixture = createFixture({
      'fac-root': [facility({ id: 'fac-child', name: 'Building A' })],
      'fac-child': [facility({ id: 'fac-grandchild', name: 'Floor 1' })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('header span')?.textContent?.trim()).toBe('3');
  });

  it('should emit navigate when a direct child row is clicked', () => {
    const child = facility({ id: 'fac-child', name: 'Building A' });
    const fixture = createFixture({ 'fac-root': [child] });
    const spy = vi.fn();
    fixture.componentInstance.navigate.subscribe(spy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const childButton = Array.from(host.querySelectorAll('ul > li > button')).find((el) =>
      el.textContent?.includes('Building A'),
    );
    (childButton as HTMLElement)?.click();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'fac-child' }));
  });

  it('should emit navigate when a grandchild row is clicked', () => {
    const grandChild = facility({ id: 'fac-grandchild', name: 'Floor 1' });
    const fixture = createFixture({
      'fac-root': [facility({ id: 'fac-child', name: 'Building A' })],
      'fac-child': [grandChild],
    });
    const spy = vi.fn();
    fixture.componentInstance.navigate.subscribe(spy);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const grandChildButton = Array.from(host.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('Floor 1'),
    );
    grandChildButton?.click();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'fac-grandchild' }));
  });

  it('should resolve the status descriptor for a facility', () => {
    const fixture = createFixture({});
    expect(fixture.componentInstance['statusDescriptor']('active')).toBeTruthy();
  });
});
