import { Component, signal, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ExclusiveSlotContribution, SlotContribution } from '@shared/layout-slot';
import { SPLIT_FOOTER_SLOT, SPLIT_HEADER_SLOT, SPLIT_SHOWCASE_SLOT } from '../slots';
import { SplitLayout } from '../split-layout.component';

@Component({ selector: 'app-showcase-stub', template: '<p id="showcase-stub">showcase</p>' })
class ShowcaseStub {}

@Component({ selector: 'app-header-stub', template: '<p id="header-stub">header</p>' })
class HeaderStub {}

@Component({ selector: 'app-footer-stub', template: '<p id="footer-stub">footer</p>' })
class FooterStub {}

function showcase(active: boolean): ExclusiveSlotContribution {
  return {
    id: 'showcase',
    priority: 10,
    component: ShowcaseStub as Type<unknown>,
    active: signal(active),
  };
}

async function render(providers: unknown[] = []): Promise<ComponentFixture<SplitLayout>> {
  await TestBed.configureTestingModule({
    imports: [SplitLayout],
    providers: [provideRouter([]), ...(providers as never[])],
  }).compileComponents();

  const fixture: ComponentFixture<SplitLayout> = TestBed.createComponent(SplitLayout);
  fixture.detectChanges();

  return fixture;
}

describe('SplitLayout', () => {
  it('renders only the form column when nothing is contributed', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#split-layout')).not.toBeNull();
    expect(element.querySelector('#split-layout-content')).not.toBeNull();
    expect(element.querySelector('#split-layout-showcase')).toBeNull();
    expect(element.querySelector('header')).toBeNull();
    expect(element.querySelector('footer')).toBeNull();
  });

  it('renders the showcase panel when a contribution claims it', async () => {
    const fixture = await render([{ provide: SPLIT_SHOWCASE_SLOT, useValue: [showcase(true)] }]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#split-layout-showcase')).not.toBeNull();
    expect(element.querySelector('#showcase-stub')).not.toBeNull();
  });

  it('drops the showcase panel while its contribution is inactive', async () => {
    const fixture = await render([{ provide: SPLIT_SHOWCASE_SLOT, useValue: [showcase(false)] }]);

    expect(fixture.nativeElement.querySelector('#split-layout-showcase')).toBeNull();
  });

  it('renders the header and footer chrome from their slots', async () => {
    const header: SlotContribution = {
      id: 'header',
      order: 10,
      component: HeaderStub as Type<unknown>,
    };
    const footer: SlotContribution = {
      id: 'footer',
      order: 10,
      component: FooterStub as Type<unknown>,
    };
    const fixture = await render([
      { provide: SPLIT_HEADER_SLOT, useValue: [header] },
      { provide: SPLIT_FOOTER_SLOT, useValue: [footer] },
    ]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('header #header-stub')).not.toBeNull();
    expect(element.querySelector('footer #footer-stub')).not.toBeNull();
  });

  it('defaults the content and column width to md', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#split-layout-content-box')?.className).toContain('max-w-md');
    expect(element.querySelector('#split-layout-column')?.className).toContain('lg:min-w-[32rem]');
  });

  it('widens the content and column width from route data', async () => {
    const fixture = await render();
    fixture.componentRef.setInput('splitWidth', 'xl');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#split-layout-content-box')?.className).toContain('max-w-xl');
    expect(element.querySelector('#split-layout-column')?.className).toContain('lg:min-w-[40rem]');
  });

  it('supports the 2xl width for a route that opts into it', async () => {
    const fixture = await render();
    fixture.componentRef.setInput('splitWidth', '2xl');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#split-layout-content-box')?.className).toContain('max-w-2xl');
    expect(element.querySelector('#split-layout-column')?.className).toContain('lg:min-w-[46rem]');
  });
});
