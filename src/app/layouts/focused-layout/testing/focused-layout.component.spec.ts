import { Component, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SlotContribution } from '@shared/layout-slot';
import { FocusedLayout } from '../focused-layout.component';
import { FOCUSED_FOOTER_SLOT, FOCUSED_HEADER_SLOT } from '../slots';

@Component({ selector: 'app-header-stub', template: '<p id="header-stub">header</p>' })
class HeaderStub {}

@Component({ selector: 'app-footer-stub', template: '<p id="footer-stub">footer</p>' })
class FooterStub {}

async function render(providers: unknown[] = []): Promise<ComponentFixture<FocusedLayout>> {
  await TestBed.configureTestingModule({
    imports: [FocusedLayout],
    providers: [provideRouter([]), ...(providers as never[])],
  }).compileComponents();

  const fixture: ComponentFixture<FocusedLayout> = TestBed.createComponent(FocusedLayout);
  fixture.detectChanges();

  return fixture;
}

describe('FocusedLayout', () => {
  it('renders the content row alone when nothing is contributed', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('#focused-layout-content')).not.toBeNull();
    expect(element.querySelector('header')).toBeNull();
    expect(element.querySelector('footer')).toBeNull();
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
      { provide: FOCUSED_HEADER_SLOT, useValue: [header] },
      { provide: FOCUSED_FOOTER_SLOT, useValue: [footer] },
    ]);
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('header #header-stub')).not.toBeNull();
    expect(element.querySelector('footer #footer-stub')).not.toBeNull();
  });
});
