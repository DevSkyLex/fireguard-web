import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableShell, type TableShellVariant } from '../table-shell.component';

/**
 * Host exercising the shell with both projected templates.
 */
@Component({
  imports: [TableShell],
  template: `
    <app-table-shell [variant]="variant">
      <ng-template #actions>
        <span class="toolbar-marker">Toolbar</span>
      </ng-template>
      <ng-template #table>
        <span class="table-marker">Native table</span>
      </ng-template>
    </app-table-shell>
  `,
})
class TableShellHost {
  public variant: TableShellVariant = 'fill';
}

/**
 * Host exercising the shell without an `#actions` template.
 */
@Component({
  imports: [TableShell],
  template: `
    <app-table-shell>
      <ng-template #table>
        <span class="table-marker">Native table</span>
      </ng-template>
    </app-table-shell>
  `,
})
class TableShellWithoutActionsHost {}

describe('TableShell', () => {
  function setup(): { host: HTMLElement; fixture: ComponentFixture<TableShellHost> } {
    TestBed.configureTestingModule({ imports: [TableShellHost] });
    const fixture = TestBed.createComponent(TableShellHost);
    fixture.detectChanges();
    return { host: fixture.nativeElement as HTMLElement, fixture };
  }

  it('projects the actions template inside the toolbar container', () => {
    const { host } = setup();

    expect(host.querySelector('.toolbar-marker')?.textContent).toBe('Toolbar');
  });

  it('projects the table template', () => {
    const { host } = setup();

    expect(host.querySelector('.table-marker')?.textContent).toBe('Native table');
  });

  it('does not render a header container when #actions is omitted', () => {
    TestBed.configureTestingModule({ imports: [TableShellWithoutActionsHost] });
    const fixture = TestBed.createComponent(TableShellWithoutActionsHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.table-marker')?.textContent).toBe('Native table');
    expect(host.textContent).not.toContain('Toolbar');
  });

  function setupWithVariant(variant: TableShellVariant): HTMLElement {
    TestBed.configureTestingModule({ imports: [TableShellHost] });
    const fixture = TestBed.createComponent(TableShellHost);
    fixture.componentInstance.variant = variant;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('applies full-height card root classes for the fill variant', () => {
    const host = setupWithVariant('fill');

    expect(host.querySelector('.p-card')?.className).toContain('h-full');
  });

  it('applies rounded, non-stretched card root classes for the card variant', () => {
    const host = setupWithVariant('card');

    expect(host.querySelector('.p-card')?.className).toContain('rounded-xl');
  });

  it('makes the host a full-height flex column for the fill variant', () => {
    const host = setupWithVariant('fill');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.className).toContain('flex');
    expect(shell?.className).toContain('h-full');
  });

  it('makes the host a plain block box for the card variant', () => {
    const host = setupWithVariant('card');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.className).toContain('block');
    expect(shell?.className).not.toContain('h-full');
  });

  it('makes the host a plain block box for the scroll variant', () => {
    const host = setupWithVariant('scroll');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.className).toContain('block');
    expect(shell?.className).not.toContain('h-full');
  });

  it('applies the same rounded, non-stretched card root classes for the scroll variant as for card', () => {
    const host = setupWithVariant('scroll');

    expect(host.querySelector('.p-card')?.className).toContain('rounded-xl');
  });

  it('reflects the fill variant on the host data-variant attribute', () => {
    const host = setupWithVariant('fill');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.getAttribute('data-variant')).toBe('fill');
  });

  it('reflects the card variant on the host data-variant attribute', () => {
    const host = setupWithVariant('card');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.getAttribute('data-variant')).toBe('card');
  });

  it('reflects the scroll variant on the host data-variant attribute', () => {
    const host = setupWithVariant('scroll');
    const shell: Element | null = host.querySelector('app-table-shell');

    expect(shell?.getAttribute('data-variant')).toBe('scroll');
  });
});
