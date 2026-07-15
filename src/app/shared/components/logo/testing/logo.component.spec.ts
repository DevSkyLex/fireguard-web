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

  it('renders the "Garde diagonale" mark: three currentColor blocks + one indigo accent', () => {
    const fixture = TestBed.createComponent(Logo);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    const rects = Array.from(host.querySelectorAll('rect'));
    expect(rects.length).toBe(4);

    const blocks = rects.filter((r) => r.getAttribute('fill') === 'currentColor');
    expect(blocks.length).toBe(3);

    const accent = rects.find((r) => r.getAttribute('fill') !== 'currentColor');
    expect(accent?.getAttribute('fill')).toBe('var(--p-primary-600)');
    expect(accent?.getAttribute('transform')).toContain('rotate(45');
  });
});
