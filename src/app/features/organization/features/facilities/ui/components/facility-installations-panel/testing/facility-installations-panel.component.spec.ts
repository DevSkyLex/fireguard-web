import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { FacilityInstallationsPanel } from '../facility-installations-panel.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'f-root',
    name: 'Northgate Plant',
    type: 'site',
    status: 'active',
    parentFacilityId: null,
    hasChildren: true,
    ...overrides,
  }) as FacilityOutput;

const createComponent = (
  root: FacilityOutput,
  childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>,
): ComponentFixture<FacilityInstallationsPanel> => {
  TestBed.configureTestingModule({
    imports: [FacilityInstallationsPanel],
    providers: [
      { provide: FacilityStore, useValue: { childFacilitiesByParent: signal(childrenByParent) } },
    ],
  });

  const fixture = TestBed.createComponent(FacilityInstallationsPanel);
  fixture.componentRef.setInput('facility', root);
  fixture.detectChanges();
  return fixture;
};

const counts = (fixture: ComponentFixture<FacilityInstallationsPanel>): string[] =>
  Array.from(
    fixture.nativeElement.querySelectorAll('[data-testid="installation-equipment-count"]'),
  ).map((node) => (node as HTMLElement).textContent?.trim() ?? '');

describe('FacilityInstallationsPanel', () => {
  it('should show how much equipment sits in each sub-location', () => {
    const fixture = createComponent(facility(), {
      'f-root': [
        facility({ id: 'b-1', name: 'Assembly Hall', type: 'building', equipmentCount: 41 }),
      ],
    });

    expect(counts(fixture)).toHaveLength(1);
    expect(counts(fixture)[0]).toContain('41');
  });

  // Zero equipment is a fact about the site; it must read as zero rather than
  // vanish, or an empty building looks the same as an uncounted one.
  it('should render a zero count rather than omitting it', () => {
    const fixture = createComponent(facility(), {
      'f-root': [facility({ id: 'b-1', name: 'Empty Wing', type: 'building', equipmentCount: 0 })],
    });

    expect(counts(fixture)[0]).toContain('0');
  });

  // An older or cached payload has no count. Printing "0" there would assert
  // something the response never said.
  it('should omit the count when the payload carries none', () => {
    const fixture = createComponent(facility(), {
      'f-root': [facility({ id: 'b-1', name: 'Assembly Hall', type: 'building' })],
    });

    expect(counts(fixture)).toHaveLength(0);
  });

  it('should count nested sub-locations too', () => {
    const fixture = createComponent(facility(), {
      'f-root': [
        facility({ id: 'b-1', name: 'Assembly Hall', type: 'building', equipmentCount: 41 }),
      ],
      'b-1': [facility({ id: 'f-1', name: 'Ground Floor', type: 'floor', equipmentCount: 22 })],
    });

    const rendered: string = counts(fixture).join(' ');
    expect(rendered).toContain('41');
    expect(rendered).toContain('22');
  });

  // The glyph names nothing for a screen reader.
  it('should give the count a text label', () => {
    const fixture = createComponent(facility(), {
      'f-root': [
        facility({ id: 'b-1', name: 'Assembly Hall', type: 'building', equipmentCount: 41 }),
      ],
    });

    expect(fixture.nativeElement.querySelector('.sr-only')?.textContent).toContain('Equipment');
  });
});
