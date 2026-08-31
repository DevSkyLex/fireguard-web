import type { ScenePalette } from '../../models/scene-palette.interface';

/**
 * Function readScenePalette
 * @function readScenePalette
 *
 * @description
 * Reads this codebase's theme tokens off a host element and resolves each
 * into a `THREE.Color` the canvas can assign directly to a material. The
 * canvas never reads CSS custom properties itself — this is the only
 * bridge between the two.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module, passed in rather than imported so this stays testable without WebGL.
 * @param {HTMLElement} hostElement - The element whose cascaded theme tokens are read.
 *
 * @returns {ScenePalette} The resolved palette.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function readScenePalette(
  THREE: typeof import('three'),
  hostElement: HTMLElement,
): ScenePalette {
  return {
    background: resolveThemeColor(THREE, hostElement, '--background', '#f4f4f5'),
    roomFill: resolveThemeColor(THREE, hostElement, '--card', '#ffffff'),
    roomSelected: resolveThemeColor(THREE, hostElement, '--primary', '#18181b'),
    floorSlab: resolveThemeColor(THREE, hostElement, '--muted', '#e4e4e7'),
    edges: resolveThemeColor(THREE, hostElement, '--border', '#d4d4d8'),
    selectionOutline: resolveThemeColor(THREE, hostElement, '--ring', '#3f3f46'),
  };
}

/**
 * Function resolveThemeColor
 * @function resolveThemeColor
 *
 * @description
 * Resolves one CSS custom property to a `THREE.Color`. This codebase's
 * tokens are authored as `oklch(...)`, a syntax `THREE.Color.setStyle`
 * cannot parse, and `getComputedStyle(hostElement).getPropertyValue(name)`
 * returns that literal `oklch(...)` source rather than a resolved colour —
 * custom properties are not computed like ordinary CSS properties. Instead,
 * a detached probe element has its `color` set to `var(name)`; `color` **is**
 * a computed property, so the cascade resolves it — but not necessarily into
 * sRGB: current Chromium serializes it back as `oklch(...)`. {@link toSrgb}
 * therefore rasterizes it rather than trusting its serialization. Falls back
 * to `fallbackColor` when the token is absent, or in an environment without a
 * working 2D canvas — a test runner among them, where `var()` is not resolved
 * at all.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module.
 * @param {HTMLElement} hostElement - The element whose cascaded custom property is read.
 * @param {string} cssVariable - The custom property's name, e.g. `--background`.
 * @param {string} fallbackColor - The colour used when resolution fails.
 *
 * @returns {InstanceType<(typeof import('three'))['Color']>} The resolved (or fallback) colour.
 */
function resolveThemeColor(
  THREE: typeof import('three'),
  hostElement: HTMLElement,
  cssVariable: string,
  fallbackColor: string,
): InstanceType<(typeof import('three'))['Color']> {
  const probe: HTMLSpanElement = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.color = `var(${cssVariable})`;
  hostElement.appendChild(probe);

  const resolved: string = getComputedStyle(probe).color.trim();
  probe.remove();

  const color: InstanceType<(typeof import('three'))['Color']> = new THREE.Color();
  const srgb: string | null = toSrgb(resolved);
  color.setStyle(srgb ?? fallbackColor);

  return color;
}

/**
 * Function toSrgb
 *
 * @description
 * Converts any computed CSS colour to an `rgb()` string `THREE.Color` can
 * parse, by painting one pixel and reading it back. A canvas rasterizes to
 * sRGB whatever colour space the source is written in, which is the whole
 * point: this repository's theme tokens are authored in `oklch()`, and
 * `THREE.Color.setStyle` has no parser for it.
 *
 * Sniffing the string instead — matching `#`, `rgb(`, `hsl(` — was the first
 * attempt and it silently failed: current Chromium serializes a computed
 * `color` back as `oklch(...)` rather than converting it, so every token fell
 * through to its fallback and the scene ignored the theme entirely. Matching
 * one more prefix would only defer the same break to the next colour space
 * the platform adds. Rasterizing asks the browser to do the conversion, so
 * there is nothing left to keep in step.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {string} value - A computed CSS colour, in any colour space.
 *
 * @returns {string | null} An `rgb()` string, or `null` when the environment
 *   has no working 2D canvas — jsdom among them, where the caller's own
 *   fallback colour then applies.
 */
function toSrgb(value: string): string | null {
  if (value === '') return null;

  try {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (context === null) return null;

    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);

    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

    return `rgb(${red}, ${green}, ${blue})`;
  } catch {
    return null;
  }
}
