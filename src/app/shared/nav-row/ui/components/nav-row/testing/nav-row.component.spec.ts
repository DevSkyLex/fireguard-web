import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NavRow } from '../nav-row.component';

@Component({ template: '' })
class StubPage {}

@Component({
  imports: [NavRow],
  template: `
    <app-nav-row
      [icon]="icon"
      label="Interventions"
      [routerLink]="routerLink"
      [exact]="exact"
      [count]="count"
    />
  `,
})
class NavRowHost {
  public icon: string | null = 'pi pi-compass';
  public routerLink: string = '/interventions';
  public exact = false;
  public count: number | null = null;
}

describe('NavRow', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NavRowHost],
      providers: [provideRouter([{ path: '**', component: StubPage }])],
    });
  });

  it('should render the icon and label', () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('i.pi-compass')).toBeTruthy();
    expect(element.textContent).toContain('Interventions');
  });

  it('should bind the routerLink target', () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/interventions');
  });

  it('should render the count when provided', () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.componentInstance.count = 4;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4');
  });

  it('should hide the count when null', () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const counts: HTMLElement[] = Array.from(element.querySelectorAll<HTMLElement>('span')).filter(
      (el: HTMLElement): boolean => el.className.includes('tabular-nums'),
    );
    expect(counts).toHaveLength(0);
  });

  it('should mark itself active with aria-current when the router url matches', async () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.detectChanges();
    const router: Router = TestBed.inject(Router);

    await router.navigateByUrl('/interventions');
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
    expect(link?.getAttribute('aria-current')).toBe('page');
  });

  it('should not be active when the router url does not match', async () => {
    const fixture = TestBed.createComponent(NavRowHost);
    fixture.detectChanges();
    const router: Router = TestBed.inject(Router);

    await router.navigateByUrl('/facilities');
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
    expect(link?.getAttribute('aria-current')).toBeNull();
  });
});
