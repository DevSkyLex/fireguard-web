import { Component, type Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { sheetSide } from '../sheet-side.service';

/** Minimal host calling {@link sheetSide} from an injection context, the same way a sheet component would. */
@Component({ selector: 'app-sheet-side-host', template: '' })
class SheetSideHost {
  public readonly side: Signal<'right' | 'bottom'> = sheetSide();
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('sheetSide', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should resolve to right above the sm breakpoint', async () => {
    stubMatchMedia(false);
    const fixture: ComponentFixture<SheetSideHost> = TestBed.createComponent(SheetSideHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.side()).toBe('right');
  });

  it('should resolve to bottom below the sm breakpoint', async () => {
    stubMatchMedia(true);
    const fixture: ComponentFixture<SheetSideHost> = TestBed.createComponent(SheetSideHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.side()).toBe('bottom');
  });

  it('should track a live breakpoint change', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((_: string, handler: (event: MediaQueryListEvent) => void) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      })),
    );
    const fixture: ComponentFixture<SheetSideHost> = TestBed.createComponent(SheetSideHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.side()).toBe('right');

    changeHandler?.({ matches: true } as MediaQueryListEvent);

    expect(fixture.componentInstance.side()).toBe('bottom');
  });

  it('should stay right when matchMedia is unavailable (SSR)', async () => {
    vi.stubGlobal('matchMedia', undefined);
    const fixture: ComponentFixture<SheetSideHost> = TestBed.createComponent(SheetSideHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.side()).toBe('right');
  });
});
