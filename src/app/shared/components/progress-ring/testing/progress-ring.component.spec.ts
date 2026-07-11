import { TestBed } from '@angular/core/testing';
import { ProgressRing } from '../progress-ring.component';

describe('ProgressRing', () => {
  function createRing() {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ProgressRing);
    fixture.componentRef.setInput('value', 60);
    fixture.componentRef.setInput('ariaLabel', '60% complete');
    fixture.detectChanges();
    return fixture;
  }

  it('renders an accessible SVG with the given aria-label', () => {
    const fixture = createRing();
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');

    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('60% complete');
  });

  it('sizes the viewport from the size input', () => {
    const fixture = createRing();
    fixture.componentRef.setInput('size', 32);
    fixture.detectChanges();

    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 32 32');
  });

  it('clamps the dash offset for out-of-range values', () => {
    const fixture = createRing();
    fixture.componentRef.setInput('value', 150);
    fixture.detectChanges();

    const circles: NodeListOf<SVGCircleElement> = fixture.nativeElement.querySelectorAll('circle');
    const arc: SVGCircleElement = circles[1];
    expect(arc.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('defaults the arc colour to the primary design token', () => {
    const fixture = createRing();
    const circles: NodeListOf<SVGCircleElement> = fixture.nativeElement.querySelectorAll('circle');
    const arc: SVGCircleElement = circles[1];
    expect(arc.getAttribute('stroke')).toBe('var(--p-primary-color)');
  });
});
