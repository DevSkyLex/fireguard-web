import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input,
  provideZonelessChangeDetection,
  type InputSignal,
  type TemplateRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PageTabsService } from '@core/page-tabs';
import { AccountPage } from '../account-page.component';

@Component({
  selector: 'app-page-tabs-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageTabsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

describe('AccountPage', () => {
  let fixture: ComponentFixture<AccountPage>;
  let tabsFixture: ComponentFixture<PageTabsHost>;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    router = TestBed.inject<Router>(Router);
    fixture = TestBed.createComponent(AccountPage);
    await fixture.whenStable();

    tabsFixture = TestBed.createComponent(PageTabsHost);
    tabsFixture.componentRef.setInput('template', TestBed.inject(PageTabsService).tabs());
    await tabsFixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should expose the account routes through the Spartan settings tab list', () => {
    const tabs: NodeListOf<HTMLButtonElement> =
      tabsFixture.nativeElement.querySelectorAll('[role="tab"]');

    expect(Array.from(tabs, (tab: HTMLButtonElement) => tab.textContent?.trim())).toEqual([
      'Profile',
      'Security',
      'Organizations',
      'Notifications',
    ]);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('should navigate to the child route selected from the tab list', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const securityTab: HTMLButtonElement = tabsFixture.nativeElement.querySelector(
      '[data-testid="account-tab-security"]',
    );

    securityTab.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      ['security'],
      expect.objectContaining({ relativeTo: expect.anything() }),
    );
  });
});
