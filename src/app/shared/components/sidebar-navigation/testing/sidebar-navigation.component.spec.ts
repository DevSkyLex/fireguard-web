import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { SidebarNavigation } from '../sidebar-navigation.component';

@Component({ template: '' })
class DummyPage {}

const ITEMS: MenuItem[] = [
  {
    id: 'home-section',
    label: 'Home',
    items: [
      { id: 'home', label: 'Home', routerLink: '/' },
      { id: 'organizations', label: 'Organizations', routerLink: '/organizations' },
    ],
  },
  {
    id: 'account-section',
    label: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', routerLink: '/account/notifications' },
    ],
  },
];

describe('SidebarNavigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SidebarNavigation],
      providers: [
        provideRouter([
          { path: '', component: DummyPage },
          { path: 'organizations', component: DummyPage },
          { path: 'account/notifications', component: DummyPage },
        ]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one p-panelmenu per section', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('p-panelmenu')).length).toBe(2);
  });

  it('should render section dividers between sections', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="sidebar-section-divider"]')).length,
    ).toBe(1);
  });

  it('should display the search input when showSearch is true (default)', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]'))).toBeTruthy();
  });

  it('should hide the search input when showSearch is false', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('showSearch', false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-search-input"]'))).toBeFalsy();
  });

  it('should show the clear button when a searchQuery is set', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('searchQuery', 'Home');
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="sidebar-search-clear"]')),
    ).toBeTruthy();
  });

  it('should not show the clear button when searchQuery is empty', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('searchQuery', '');
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testid="sidebar-search-clear"]')),
    ).toBeFalsy();
  });

  it('should emit searchQueryChange when input changes', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.searchQueryChange.subscribe((v: string) => emitted.push(v));

    const input = fixture.debugElement.query(
      By.css('[data-testid="sidebar-search-input"]'),
    ).nativeElement as HTMLInputElement;

    input.value = 'not';
    input.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['not']);
  });

  it('should emit searchQueryChange with empty string when clear is clicked', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('searchQuery', 'abc');
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.searchQueryChange.subscribe((v: string) => emitted.push(v));

    const clearBtn = fixture.debugElement.query(
      By.css('[data-testid="sidebar-search-clear"]'),
    ).nativeElement as HTMLElement;
    clearBtn.click();

    expect(emitted).toEqual(['']);
  });

  it('should show the no results message when items is empty', () => {
    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results found.');
    expect(fixture.debugElement.query(By.css('p-panelmenu'))).toBeFalsy();
  });

  it('should mark the active route item with aria-current="page"', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account/notifications');

    const fixture = TestBed.createComponent(SidebarNavigation);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const notificationsLink = fixture.debugElement.query(
      By.css('a[data-sidebar-item-id="notifications"]'),
    );
    const homeLink = fixture.debugElement.query(
      By.css('a[data-sidebar-item-id="home"]'),
    );

    expect(notificationsLink.nativeElement.getAttribute('aria-current')).toBe('page');
    expect(homeLink.nativeElement.getAttribute('aria-current')).toBeNull();
  });
});
