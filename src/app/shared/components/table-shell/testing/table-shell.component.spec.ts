import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableShell } from '../table-shell.component';
import { tablePt } from '../utils';

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
  public variant: 'fill' | 'card' = 'fill';
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

  function setupWithVariant(variant: 'fill' | 'card'): HTMLElement {
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
});

describe('tablePt', () => {
  it('always sets the compact text-sm table class', () => {
    expect(tablePt().table).toEqual({ class: 'text-sm' });
  });

  it('returns only the table and tbody classes when fill is false', () => {
    expect(tablePt({ fill: false })).toEqual({
      table: { class: 'text-sm' },
      tbody: { class: '[&>tr:last-child>td]:border-b-0' },
    });
  });

  it('builds the full-height layout classes when fill is true (default)', () => {
    const pt = tablePt();

    expect(pt.root).toEqual({ class: 'flex min-h-0 flex-1 flex-col' });
    expect(pt.tableContainer).toEqual({ class: 'min-h-0 flex-1 overflow-hidden' });
  });

  it('never rounds the table container or the paginator (the card alone clips corners)', () => {
    const pt = tablePt({ empty: false });

    expect(pt.tableContainer).toEqual({ class: 'min-h-0 flex-1 overflow-hidden' });
    expect(pt.pcPaginator).toEqual({
      root: { class: 'mt-auto justify-end bg-surface-0 dark:bg-surface-950' },
    });
  });

  it('does not hide the paginator when the page has rows', () => {
    const pt = tablePt({ empty: false });

    expect(pt.pcPaginator).toEqual({
      root: { class: 'mt-auto justify-end bg-surface-0 dark:bg-surface-950' },
    });
  });

  it('hides the paginator when the page is empty', () => {
    const pt = tablePt({ empty: true });

    expect(pt.pcPaginator).toEqual({
      root: { class: 'mt-auto justify-end bg-surface-0 dark:bg-surface-950 hidden' },
    });
  });

  it('hides a card-variant table own internal paginator when the page is empty', () => {
    const pt = tablePt({ fill: false, empty: true });

    expect(pt.pcPaginator).toEqual({ root: { class: 'hidden' } });
  });
});
