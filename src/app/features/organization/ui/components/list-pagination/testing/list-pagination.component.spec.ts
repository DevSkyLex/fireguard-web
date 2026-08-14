import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ListPagination } from '../list-pagination.component';

describe('ListPagination', () => {
  let fixture: ComponentFixture<ListPagination>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ListPagination);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageCount', 5);
    fixture.componentRef.setInput('pageSize', 30);
    fixture.componentRef.setInput('total', 120);
    fixture.componentRef.setInput('shown', 30);
    fixture.componentRef.setInput('testIdPrefix', 'widgets');
    await fixture.whenStable();
  });

  function byTestId(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  }

  it('should render the page indicator', () => {
    expect(byTestId('widgets-page-indicator')?.textContent).toContain('Page 2 of 5');
  });

  it('should render the row count', () => {
    expect(byTestId('widgets-row-count')?.textContent).toContain('30 of 120 row(s) shown');
  });

  it('should localize the pagination nav accessible name', () => {
    const nav = fixture.nativeElement.querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Pagination');
  });

  it('should mark the row count as a polite live region', () => {
    const rowCount = byTestId('widgets-row-count');

    expect(rowCount?.getAttribute('aria-live')).toBe('polite');
    expect(rowCount?.getAttribute('aria-atomic')).toBe('true');
  });

  it('should use the given prefix for every control', () => {
    expect(byTestId('widgets-page-first')).not.toBeNull();
    expect(byTestId('widgets-page-prev')).not.toBeNull();
    expect(byTestId('widgets-page-next')).not.toBeNull();
    expect(byTestId('widgets-page-last')).not.toBeNull();
    expect(byTestId('widgets-page-size')).not.toBeNull();
  });

  it('should localize the navigation buttons accessible names', () => {
    expect(byTestId('widgets-page-first')?.getAttribute('aria-label')).toBe('First page');
    expect(byTestId('widgets-page-prev')?.getAttribute('aria-label')).toBe('Previous page');
    expect(byTestId('widgets-page-next')?.getAttribute('aria-label')).toBe('Next page');
    expect(byTestId('widgets-page-last')?.getAttribute('aria-label')).toBe('Last page');
  });

  it('should not disable any navigation button on a middle page', () => {
    expect((byTestId('widgets-page-first') as HTMLButtonElement).disabled).toBe(false);
    expect((byTestId('widgets-page-prev') as HTMLButtonElement).disabled).toBe(false);
    expect((byTestId('widgets-page-next') as HTMLButtonElement).disabled).toBe(false);
    expect((byTestId('widgets-page-last') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should disable first and previous on the first page', async () => {
    fixture.componentRef.setInput('page', 1);
    await fixture.whenStable();

    expect((byTestId('widgets-page-first') as HTMLButtonElement).disabled).toBe(true);
    expect((byTestId('widgets-page-prev') as HTMLButtonElement).disabled).toBe(true);
    expect((byTestId('widgets-page-next') as HTMLButtonElement).disabled).toBe(false);
    expect((byTestId('widgets-page-last') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should disable next and last on the last page', async () => {
    fixture.componentRef.setInput('page', 5);
    await fixture.whenStable();

    expect((byTestId('widgets-page-next') as HTMLButtonElement).disabled).toBe(true);
    expect((byTestId('widgets-page-last') as HTMLButtonElement).disabled).toBe(true);
    expect((byTestId('widgets-page-first') as HTMLButtonElement).disabled).toBe(false);
    expect((byTestId('widgets-page-prev') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should emit pageChanged with 1 when first is clicked', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageChanged.subscribe((value: number) => emitted.push(value));

    byTestId('widgets-page-first')?.click();

    expect(emitted).toEqual([1]);
  });

  it('should emit pageChanged with the previous page when prev is clicked', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageChanged.subscribe((value: number) => emitted.push(value));

    byTestId('widgets-page-prev')?.click();

    expect(emitted).toEqual([1]);
  });

  it('should emit pageChanged with the next page when next is clicked', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageChanged.subscribe((value: number) => emitted.push(value));

    byTestId('widgets-page-next')?.click();

    expect(emitted).toEqual([3]);
  });

  it('should emit pageChanged with the last page when last is clicked', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageChanged.subscribe((value: number) => emitted.push(value));

    byTestId('widgets-page-last')?.click();

    expect(emitted).toEqual([5]);
  });

  it('should emit pageSizeChanged with the picked value', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageSizeChanged.subscribe((value: number) => emitted.push(value));

    const select = fixture.debugElement.query(By.css('hlm-select'));
    select.triggerEventHandler('valueChange', 60);

    expect(emitted).toEqual([60]);
  });

  it('should fall back to the current page size when the select clears its value', () => {
    const emitted: number[] = [];
    fixture.componentInstance.pageSizeChanged.subscribe((value: number) => emitted.push(value));

    const select = fixture.debugElement.query(By.css('hlm-select'));
    select.triggerEventHandler('valueChange', null);

    expect(emitted).toEqual([30]);
  });

  it('should default the page sizes to 30/60/100', () => {
    expect(fixture.componentInstance.pageSizes()).toEqual([30, 60, 100]);
  });
});
