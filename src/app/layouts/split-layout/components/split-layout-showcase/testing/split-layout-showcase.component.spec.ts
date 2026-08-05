import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { SplitLayoutShowcase } from '../split-layout-showcase.component';

describe('SplitLayoutShowcase', () => {
  let fixture: ComponentFixture<SplitLayoutShowcase>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(SplitLayoutShowcase);
    await fixture.whenStable();
  });

  it('should name the product', () => {
    expect(fixture.nativeElement.textContent).toContain('FireGuard');
  });

  it('should render one entry per proof point', () => {
    const points = fixture.nativeElement.querySelectorAll('li');

    expect(points.length).toBe(3);
  });

  it('should describe what the product does rather than only claim it', () => {
    // Each point carries a detail sentence; a panel of three bare labels would
    // be a slogan, not a description.
    const details = Array.from(
      fixture.nativeElement.querySelectorAll('li p') as NodeListOf<HTMLElement>,
    );

    expect(details.length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('syncs when the network returns');
  });

  it('should hide the decorative layer from assistive technology', () => {
    const decorations = fixture.nativeElement.querySelectorAll('[aria-hidden="true"]');

    // The glow and every icon are decoration: the text carries the meaning.
    expect(decorations.length).toBeGreaterThan(0);
  });
});
