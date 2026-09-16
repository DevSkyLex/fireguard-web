import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { sheetSide } from '../sheet-side.service';

describe('sheetSide', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['mobile', 'bottom', 1440],
    ['mobile', 'bottom', 375],
    ['desktop', 'right', 375],
    ['desktop', 'right', 1440],
  ] as const)(
    'resolves %s to %s independently of a %dpx viewport',
    (interactionMode, expected, width) => {
      vi.stubGlobal('innerWidth', width);
      const match = vi.fn();
      vi.stubGlobal('matchMedia', match);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: INTERACTION_CAPABILITIES_PORT,
            useValue: { isMobileInteractionMode: signal(interactionMode === 'mobile') },
          },
        ],
      });
      const side = TestBed.runInInjectionContext(sheetSide);
      expect(side()).toBe(expected);
      expect(match).not.toHaveBeenCalled();
    },
  );

  it('follows central mode changes immediately', () => {
    const isMobileInteractionMode = signal(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode } },
      ],
    });
    const side = TestBed.runInInjectionContext(sheetSide);
    expect(side()).toBe('right');
    isMobileInteractionMode.set(true);
    expect(side()).toBe('bottom');
    isMobileInteractionMode.set(false);
    expect(side()).toBe('right');
  });
});
