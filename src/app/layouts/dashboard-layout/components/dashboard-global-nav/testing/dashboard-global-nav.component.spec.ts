import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardGlobalNav } from '../dashboard-global-nav.component';

describe('DashboardGlobalNav', () => {
  let fixture: ComponentFixture<DashboardGlobalNav>;

  /**
   * The rendered rows, in order, whether or not they lead anywhere.
   */
  function rows(): readonly string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-slot="sidebar-menu-button"]',
      ) as NodeListOf<HTMLElement>,
    ).map((row: HTMLElement): string => row.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(DashboardGlobalNav);
    await fixture.whenStable();
  });

  it('should list every global destination', () => {
    expect(rows()).toEqual(['Assistant', 'Live messages', 'Support']);
  });

  it('should render a destination that does not exist yet as unavailable', () => {
    const assistant: HTMLElement | null =
      fixture.nativeElement.querySelector('#global-nav-assistant');

    expect(assistant?.tagName).toBe('BUTTON'); // An anchor would be a link to a 404.
    expect(assistant?.getAttribute('aria-disabled')).toBe('true');
  });

  it('should say why an unavailable destination does nothing', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-slot="sidebar-menu-badge"]').length).toBe(
      3,
    );
  });

  it('should sit at the bottom of the column', () => {
    // The rows are utilities, not the work: they stay under the organization block.
    expect((fixture.nativeElement as HTMLElement).classList).toContain('mt-auto');
  });
});
