import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PANEL_SLOT, type PanelContribution } from '@layouts/workspace-layout/slots/panel';
import { WorkspaceLayoutPanelOutlet } from '../workspace-layout-panel-outlet.component';

@Component({ template: '<div data-testid="low-panel"></div>' })
class LowPriorityPanelStub {}

@Component({ template: '<div data-testid="high-panel"></div>' })
class HighPriorityPanelStub {}

function contribution(
  id: string,
  priority: number,
  active: WritableSignal<boolean>,
  component: unknown,
): PanelContribution {
  return {
    id,
    priority,
    active,
    component: component as PanelContribution['component'],
    widthClass: 'lg:w-[330px]',
    ariaLabel: `${id} panel`,
  };
}

describe('WorkspaceLayoutPanelOutlet', () => {
  const lowActive: WritableSignal<boolean> = signal<boolean>(false);
  const highActive: WritableSignal<boolean> = signal<boolean>(false);

  beforeEach(() => {
    lowActive.set(false);
    highActive.set(false);

    TestBed.configureTestingModule({
      imports: [WorkspaceLayoutPanelOutlet],
      providers: [
        {
          provide: PANEL_SLOT,
          useValue: contribution('low', 10, lowActive, LowPriorityPanelStub),
          multi: true,
        },
        {
          provide: PANEL_SLOT,
          useValue: contribution('high', 90, highActive, HighPriorityPanelStub),
          multi: true,
        },
      ],
    });
  });

  it('should render nothing when no contribution is active', () => {
    const fixture = TestBed.createComponent(WorkspaceLayoutPanelOutlet);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('aside'))).toBeFalsy();
  });

  it('should render the only active contribution', () => {
    const fixture = TestBed.createComponent(WorkspaceLayoutPanelOutlet);
    lowActive.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="low-panel"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="high-panel"]'))).toBeFalsy();
  });

  it('should render only the highest-priority contribution when several are active', () => {
    const fixture = TestBed.createComponent(WorkspaceLayoutPanelOutlet);
    lowActive.set(true);
    highActive.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="high-panel"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="low-panel"]'))).toBeFalsy();
    expect(fixture.debugElement.queryAll(By.css('aside'))).toHaveLength(1);
  });

  it('should fall back to the next active contribution when the winner deactivates', () => {
    const fixture = TestBed.createComponent(WorkspaceLayoutPanelOutlet);
    lowActive.set(true);
    highActive.set(true);
    fixture.detectChanges();

    highActive.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="low-panel"]'))).toBeTruthy();
  });

  it('should apply the winning contribution width class and aria label', () => {
    const fixture = TestBed.createComponent(WorkspaceLayoutPanelOutlet);
    highActive.set(true);
    fixture.detectChanges();

    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;

    expect(aside.classList).toContain('lg:w-[330px]');
    expect(aside.getAttribute('aria-label')).toBe('high panel');
  });
});
