import { TestBed } from '@angular/core/testing';
import { BELOW_SM, mediaQuery } from '../breakpoint.service';

describe('mediaQuery', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('starts false until after rendering, then measures geometry', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const narrow = TestBed.runInInjectionContext(() => mediaQuery(BELOW_SM));
    expect(narrow()).toBe(false);
    TestBed.tick();
    expect(narrow()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 639px)');
  });

  it('observes an arbitrary query, tracks changes and removes its listener on destruction', () => {
    let change: ((event: MediaQueryListEvent) => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void): void => {
          change = handler;
        },
        removeEventListener: remove,
      }),
    );
    const wide = TestBed.runInInjectionContext(() => mediaQuery('(min-width: 1280px)'));
    TestBed.tick();
    expect(wide()).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 1280px)');
    change?.({ matches: true } as MediaQueryListEvent);
    expect(wide()).toBe(true);
    TestBed.resetTestingModule();
    expect(remove).toHaveBeenCalledWith('change', change);
  });

  it('retains the safe geometry fallback without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const narrow = TestBed.runInInjectionContext(() => mediaQuery(BELOW_SM));
    TestBed.tick();
    expect(narrow()).toBe(false);
  });
});
