import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { DashboardSidebarNavigationService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSearch } from '../dashboard-layout-search.component';

@Component({ template: '' })
class DummyPage {}

const openPalette = (
  fixture: ReturnType<typeof TestBed.createComponent<DashboardLayoutSearch>>,
) => {
  const trigger = fixture.debugElement.query(By.css('[data-testid="header-search-trigger"]'));
  (trigger.nativeElement as HTMLButtonElement).click();
  fixture.detectChanges();
};

const paletteInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('[data-testid="header-search-input"]');

const paletteItems = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-search-item]'),
];

describe('DashboardLayoutSearch', () => {
  const menuItems = signal<MenuItem[]>([
    {
      id: 'home',
      label: 'Home',
      items: [
        {
          id: 'organizations',
          label: 'Organizations',
          icon: 'pi pi-sitemap',
          routerLink: '/organizations',
        },
      ],
    },
    {
      id: 'assets',
      label: 'Assets',
      items: [
        {
          id: 'facilities',
          label: 'Facilities',
          icon: 'pi pi-building',
          routerLink: '/organizations/org-1/facilities',
        },
        {
          id: 'equipments',
          label: 'Equipments',
          icon: 'pi pi-box',
          routerLink: '/organizations/org-1/equipments',
        },
      ],
    },
  ]);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSearch],
      providers: [
        provideRouter([
          { path: 'organizations', component: DummyPage },
          { path: 'organizations/:organizationId/facilities', component: DummyPage },
          { path: 'organizations/:organizationId/equipments', component: DummyPage },
        ]),
        { provide: DashboardSidebarNavigationService, useValue: { menuItems } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the search trigger with the shortcut hint', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('[data-testid="header-search-trigger"]'));
    expect(trigger).toBeTruthy();
    expect(trigger.nativeElement.textContent).toMatch(/⌘K|Ctrl K/);
  });

  it('should open the palette listing every destination', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    fixture.detectChanges();

    openPalette(fixture);

    const labels = paletteItems().map((item) => item.textContent?.trim() ?? '');
    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain('Organizations');
    expect(labels[1]).toContain('Facilities');
    expect(labels[2]).toContain('Equipments');
  });

  it('should open the palette on Ctrl+K', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    fixture.detectChanges();

    expect(paletteInput()).toBeTruthy();
  });

  it('should filter destinations by query', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    fixture.detectChanges();

    openPalette(fixture);

    const input = paletteInput() as HTMLInputElement;
    input.value = 'facil';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const items = paletteItems();
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Facilities');
  });

  it('should show an empty state when nothing matches', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    fixture.detectChanges();

    openPalette(fixture);

    const input = paletteInput() as HTMLInputElement;
    input.value = 'zzzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(paletteItems()).toHaveLength(0);
    expect(document.body.textContent).toContain('No matching destination.');
  });

  it('should navigate to the selected destination and close the palette', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSearch);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    openPalette(fixture);

    paletteItems()[1].click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/organizations/org-1/facilities');
    expect(fixture.componentInstance['visible']()).toBe(false);
  });
});
