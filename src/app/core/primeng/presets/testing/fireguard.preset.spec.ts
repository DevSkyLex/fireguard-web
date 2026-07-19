import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardModule } from 'primeng/card';
import { providePrimeNG } from 'primeng/config';
import { FireguardTheme } from '../fireguard.preset';

/**
 * The preset's `css:` blocks are the only place where a *structural* rule can
 * live (a token cannot express `display: flex` or a media query). PrimeNG
 * injects them per component, on first render, into a
 * `<style data-primeng-style-id="<component>-style">` element — so a broken
 * block fails silently at runtime and neither the build nor a token assertion
 * would notice.
 *
 * These specs pin the two rules the entity tables now depend on, after
 * `TABLE_CARD_SHELL_STYLE_CLASS` / `_PT` were deleted in favour of the
 * `data-shell="table"` variant.
 */
@Component({
  imports: [CardModule],
  template: `<p-card data-shell="table"><p>body</p></p-card>`,
})
class CardHost {}

/**
 * PrimeNG minifies the injected block, so assertions are made against a
 * space-stripped copy rather than the source formatting.
 */
function cardStyle(): string {
  const style = document.querySelector('style[data-primeng-style-id="card-style"]');

  return (style?.textContent ?? '').replace(/\s+/g, '');
}

describe('FireguardTheme', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CardHost],
      providers: [providePrimeNG({ theme: { preset: FireguardTheme } })],
    });
    TestBed.createComponent(CardHost).detectChanges();
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
