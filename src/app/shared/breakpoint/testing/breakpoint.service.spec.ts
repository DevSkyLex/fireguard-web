import { Component, type Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BELOW_SM, isCompact, mediaQuery } from '../breakpoint.service';

/** Minimal host calling the primitive from an injection context, as a component would. */
@Component({ selector: 'app-breakpoint-host', template: '' })
class BreakpointHost {
  public readonly compact: Signal<boolean> = isCompact();
}

/** A second host, kept separate so each spec observes exactly one query. */
@Component({ selector: 'app-breakpoint-wide-host', template: '' })
class BreakpointWideHost {
  public readonly wide: Signal<boolean> = mediaQuery('(min-width: 1280px)');
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

describe('breakpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should report a matching query', async () => {
    stubMatchMedia(true);
    const fixture: ComponentFixture<BreakpointHost> = TestBed.createComponent(BreakpointHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.compact()).toBe(true);
  });

  it('should report a non-matching query', async () => {
    stubMatchMedia(false);
    const fixture: ComponentFixture<BreakpointHost> = TestBed.createComponent(BreakpointHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.compact()).toBe(false);
  });

  it('should observe the sm query for isCompact', async () => {
    stubMatchMedia(false);
    const fixture: ComponentFixture<BreakpointHost> = TestBed.createComponent(BreakpointHost);
    await fixture.whenStable();

    expect(matchMedia).toHaveBeenCalledWith(BELOW_SM);
  });

  it('should observe an arbitrary query verbatim', async () => {
    stubMatchMedia(true);
    const fixture: ComponentFixture<BreakpointWideHost> =
      TestBed.createComponent(BreakpointWideHost);
    await fixture.whenStable();

    expect(matchMedia).toHaveBeenCalledWith('(min-width: 1280px)');
    expect(fixture.componentInstance.wide()).toBe(true);
  });

  it('should track a live change', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void): void => {
          changeHandler = handler;
        },
        removeEventListener: vi.fn(),
      })),
    );
    const fixture: ComponentFixture<BreakpointHost> = TestBed.createComponent(BreakpointHost);
    await fixture.whenStable();

    expect(fixture.componentInstance.compact()).toBe(false);

    changeHandler?.({ matches: true } as MediaQueryListEvent);
    await fixture.whenStable();

    expect(fixture.componentInstance.compact()).toBe(true);
  });
});
