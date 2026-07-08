import { TestBed } from '@angular/core/testing';
import { Logo } from '../logo.component';

describe('Logo', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Logo] });
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(Logo);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the brand gradient mark by default (three strokes referencing the gradient)', () => {
    const fixture = TestBed.createComponent(Logo);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    const gradient = host.querySelector('linearGradient');
    expect(gradient?.id).toBe('fireguard-logo-gradient');

    const paths = host.querySelectorAll('path');
    expect(paths.length).toBe(3);
    for (const path of Array.from(paths)) {
      expect(path.getAttribute('stroke')).toBe('url(#fireguard-logo-gradient)');
    }
  });
});
