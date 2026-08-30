import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionSkeletonRows } from '../collection-skeleton-rows.component';

describe('CollectionSkeletonRows', () => {
  let fixture: ComponentFixture<CollectionSkeletonRows>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionSkeletonRows);
    await fixture.whenStable();
  });

  it('draws the default five rows when nothing is configured', () => {
    const rows: NodeListOf<HTMLElement> = root().querySelectorAll('tr');

    expect(rows.length).toBe(5);
  });

  it('draws as many rows as the rows input asks for', async () => {
    fixture.componentRef.setInput('rows', 3);
    await fixture.whenStable();

    expect(root().querySelectorAll('tr').length).toBe(3);
  });

  it('marks every row aria-hidden so a screen reader skips the placeholders', async () => {
    fixture.componentRef.setInput('rows', 2);
    await fixture.whenStable();

    const rows: HTMLElement[] = [...root().querySelectorAll('tr')];

    expect(
      rows.every((row: HTMLElement): boolean => row.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('draws one cell per literal column width', async () => {
    fixture.componentRef.setInput('rows', 1);
    fixture.componentRef.setInput('columns', ['w-14', 'w-56', 'w-24']);
    await fixture.whenStable();

    const cells: NodeListOf<HTMLElement> = root().querySelectorAll('tr td');

    expect(cells.length).toBe(3);
    expect(cells[0].querySelector('hlm-skeleton')?.className).toContain('w-14');
    expect(cells[1].querySelector('hlm-skeleton')?.className).toContain('w-56');
    expect(cells[2].querySelector('hlm-skeleton')?.className).toContain('w-24');
  });

  it('falls back to columnCount generic cells when no widths are given', async () => {
    fixture.componentRef.setInput('rows', 1);
    fixture.componentRef.setInput('columnCount', 4);
    await fixture.whenStable();

    expect(root().querySelectorAll('tr td').length).toBe(4);
  });

  it('renders no cells when neither columns nor columnCount is given', () => {
    expect(root().querySelectorAll('tr td').length).toBe(0);
  });

  it("does not render its own status announcement — that is the surface's job", () => {
    expect(root().querySelector('[role="status"]')).toBeNull();
  });
});
