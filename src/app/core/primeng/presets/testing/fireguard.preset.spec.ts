import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardModule } from 'primeng/card';
import { providePrimeNG } from 'primeng/config';
import { TabsModule } from 'primeng/tabs';
import { FireguardTheme } from '../fireguard.preset';

/**
 * The preset's `css:` blocks are the only place where a *structural* rule can
 * live (a token cannot express `display: flex` or a media query). PrimeNG
 * injects them per component, on first render, into a
 * `<style data-primeng-style-id="<component>-style">` element — so a broken
 * block fails silently at runtime and neither the build nor a token assertion
 * would notice.
 *
 * These specs pin the rules the entity tables and detail pages now depend on,
 * after `TABLE_CARD_SHELL_*` and `DETAIL_TAB*_PT` were deleted in favour of
 * `data-shell` variants.
 */
@Component({
  imports: [CardModule],
  template: `<p-card data-shell="table"><p>body</p></p-card>`,
})
class CardHost {}

/**
 * Deliberately without `<p-tablist>`: PrimeNG's TabList binds a
 * `ResizeObserver` in `ngAfterViewInit`, which jsdom does not provide. The
 * `tabs-style` block is registered by the `p-tabs` root alone, which is all
 * these assertions need.
 */
@Component({
  imports: [TabsModule],
  template: `<p-tabs data-shell="detail" [value]="0">
    <p-tabpanels><p-tabpanel [value]="0">Body</p-tabpanel></p-tabpanels>
  </p-tabs>`,
})
class TabsHost {}

/**
 * PrimeNG minifies the injected block, so assertions are made against a
 * space-stripped copy rather than the source formatting.
 */
function injectedStyle(component: string): string {
  const style = document.querySelector(`style[data-primeng-style-id="${component}-style"]`);

  return (style?.textContent ?? '').replace(/\s+/g, '');
}

function cardStyle(): string {
  return injectedStyle('card');
}

/**
 * `Preset['semantic']` is typed as `{}` upstream, so the surface ramps are not
 * navigable without stating their shape. Local to this spec: it describes what
 * the assertions read, not a contract the preset must satisfy elsewhere.
 */
interface SemanticColorSchemes {
  readonly colorScheme: {
    readonly light: { readonly surface: Record<string, string> };
    readonly dark: { readonly surface: Record<string, string> };
  };
}

describe('FireguardTheme', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CardHost],
      providers: [providePrimeNG({ theme: { preset: FireguardTheme } })],
    });
    TestBed.createComponent(CardHost).detectChanges();
  });

  it('maps both surface ramps to the design system zinc primitives', () => {
    // The mockup's `--fg-neutral-*` ramp is Tailwind zinc value for value
    // (#fafafa … #09090b). The preset previously pointed at Aura's `neutral`,
    // a half-tone warmer at every step — close enough to pass unnoticed, which
    // is exactly why it is pinned here.
    const { light, dark } = (FireguardTheme.semantic as SemanticColorSchemes).colorScheme;

    for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(light.surface[shade]).toBe(`{zinc.${shade}}`);
      expect(dark.surface[shade]).toBe(`{zinc.${shade}}`);
    }

    // surface.0 stays an absolute white in both schemes: it is the paper the
    // flat, bordered surfaces sit on, not a step of the ramp.
    expect(light.surface[0]).toBe('#ffffff');
  });

  it('ships the detail tabset variant', () => {
    TestBed.createComponent(TabsHost).detectChanges();
    const css = injectedStyle('tabs');

    // The panel area becomes the page scroller instead of growing the document.
    expect(css).toContain(".p-tabs[data-shell='detail']{display:flex");
    expect(css).toContain(".p-tabs[data-shell='detail'].p-tabpanels{");
    expect(css).toContain('overflow-y:auto');
    // The class names are PrimeNG's own (TabListClasses/TabPanelsClasses); a
    // typo here yields dead CSS that nothing else would surface.
    expect(css).toContain('.p-tablist-tab-list{padding-inline:1rem');
  });

  it('renders the card as a flat bordered surface', () => {
    const css = cardStyle();

    expect(css).toContain('.p-card{border:1pxsolidvar(--p-content-border-color)');
  });

  it('ships the table-shell variant', () => {
    const css = cardStyle();

    // Flush, full-height frame whose body scrolls internally…
    expect(css).toContain(".p-card[data-shell='table']{display:flex");
    expect(css).toContain('min-height:0;padding:0');
    // …and whose header is a divided toolbar that turns into a row at sm.
    expect(css).toContain('border-bottom:1pxsolidvar(--p-content-border-color)');
    expect(css).toContain('@media(min-width:40rem)');
  });

  it('puts the variant attribute on the element carrying .p-card', () => {
    // The selector is `.p-card[data-shell='table']`, so both must land on the
    // same node — PrimeNG's card host is the `.p-card` element itself.
    const host = document.querySelector('.p-card');

    expect(host?.getAttribute('data-shell')).toBe('table');
  });
});
