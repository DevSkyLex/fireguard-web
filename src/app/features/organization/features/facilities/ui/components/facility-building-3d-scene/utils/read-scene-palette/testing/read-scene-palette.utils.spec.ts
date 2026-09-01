import * as THREE from 'three';
import { readScenePalette } from '../read-scene-palette.utils';

/**
 * Stands in for the browser's 2D canvas, which jsdom does not provide.
 *
 * The util rasterizes a computed colour rather than pattern-matching its
 * serialization, precisely because the serialization is not dependable: a
 * current Chromium hands back `oklch(...)` verbatim, which is how the theme
 * tokens are authored and which `THREE.Color` cannot parse. The fake records
 * what was painted and answers with fixed pixels, so the spec can assert the
 * conversion path is taken at all — the real colour maths belongs to the
 * browser and is proven by the visual check, not here.
 */
function stubCanvas(pixel: readonly [number, number, number]): { painted: string[] } {
  const painted: string[] = [];

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    set fillStyle(value: string) {
      painted.push(value);
    },
    get fillStyle(): string {
      return painted.at(-1) ?? '';
    },
    fillRect: (): void => undefined,
    getImageData: () => ({ data: Uint8ClampedArray.from([...pixel, 255]) }),
  } as unknown as CanvasRenderingContext2D);

  return { painted };
}

describe('readScenePalette', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rasterizes a computed colour the browser resolved, whatever its colour space', () => {
    // oklch() is the format this repository's tokens are authored in, and the
    // one that silently broke the previous string-sniffing implementation.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color: 'oklch(0.145 0 0)',
    } as CSSStyleDeclaration);
    const { painted } = stubCanvas([18, 52, 86]);

    const palette = readScenePalette(THREE, document.createElement('div'));

    expect(painted).toContain('oklch(0.145 0 0)');
    expect(palette.background.getHexString()).toBe('123456');
    expect(palette.roomFill.getHexString()).toBe('123456');
    expect(palette.roomSelected.getHexString()).toBe('123456');
    expect(palette.floorSlab.getHexString()).toBe('123456');
    expect(palette.edges.getHexString()).toBe('123456');
  });

  it('falls back to the default colour where no 2D canvas exists', () => {
    // jsdom's own behaviour, and the reason every token must carry a fallback.
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color: 'oklch(1 0 0)',
    } as CSSStyleDeclaration);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    const palette = readScenePalette(THREE, document.createElement('div'));

    expect(palette.background.getHexString()).toBe(new THREE.Color('#f4f4f5').getHexString());
  });

  it('falls back to the default colour for an empty computed value', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ color: '' } as CSSStyleDeclaration);
    stubCanvas([0, 0, 0]);

    const palette = readScenePalette(THREE, document.createElement('div'));

    expect(palette.roomSelected.getHexString()).toBe(new THREE.Color('#18181b').getHexString());
  });

  it('appends and removes the probe element from the given host', () => {
    const host = document.createElement('div');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color: 'rgb(0, 0, 0)',
    } as CSSStyleDeclaration);
    stubCanvas([0, 0, 0]);

    readScenePalette(THREE, host);

    expect(host.childElementCount).toBe(0);
  });
});
