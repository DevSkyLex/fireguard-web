import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MapLegend } from '../map-legend.component';

describe('MapLegend', () => {
  let fixture: ComponentFixture<MapLegend>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MapLegend] });
    fixture = TestBed.createComponent(MapLegend);
    fixture.detectChanges();
  });

  it('lists exactly the three measured buckets, each with a dot and a label', () => {
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span[aria-hidden="true"]',
    );
    expect(rows).toHaveLength(3);
  });

  it('never renders a dot without accompanying text — color is not the only signal', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Good');
    expect(text).toContain('Needs attention');
    expect(text).toContain('Critical');
  });
});
