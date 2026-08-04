import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityDetailHeader } from '../facility-detail-header.component';

const FACILITY = {
  id: 'fac-1',
  name: 'Site Nord',
  type: 'warehouse',
  status: 'active',
  code: 'FAC-014',
  address: '12 rue des Forges',
  createdAt: '2026-01-01T00:00:00+00:00',
  updatedAt: '2026-08-01T00:00:00+00:00',
} as unknown as FacilityOutput;

describe('FacilityDetailHeader', () => {
  let fixture: ComponentFixture<FacilityDetailHeader>;

  const render = (canManage: boolean): ComponentFixture<FacilityDetailHeader> => {
    fixture = TestBed.createComponent(FacilityDetailHeader);
    fixture.componentRef.setInput('facility', FACILITY);
    fixture.componentRef.setInput('canManage', canManage);
    fixture.detectChanges();

    return fixture;
  };

  const buttonLabelled = (text: string): HTMLElement | undefined =>
    fixture.debugElement
      .queryAll(By.css('button'))
      .map((debugElement) => debugElement.nativeElement as HTMLElement)
      .find((element) => (element.textContent ?? '').includes(text));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FacilityDetailHeader] });
  });

  it('should render the facility name as the page heading', () => {
    render(true);

    expect(fixture.debugElement.query(By.css('h1')).nativeElement.textContent).toContain(
      'Site Nord',
    );
  });

  /**
   * Both actions are asserted because the record itself became the edit surface:
   * the header lost its "Edit" button in that change, and nothing else covered
   * the two that must survive it.
   */
  it('should offer Move and Delete to a manager, and emit them', () => {
    render(true);

    let moved = false;
    let deleted = false;
    fixture.componentInstance.move.subscribe(() => (moved = true));
    fixture.componentInstance.delete.subscribe(() => (deleted = true));

    buttonLabelled('Move')?.click();
    buttonLabelled('Delete')?.click();

    expect(moved).toBe(true);
    expect(deleted).toBe(true);
  });

  it('should offer no management action without the permission', () => {
    render(false);

    expect(buttonLabelled('Move')).toBeUndefined();
    expect(buttonLabelled('Delete')).toBeUndefined();
  });

  it('should not offer an Edit action, the record being its own edit surface', () => {
    render(true);

    expect(buttonLabelled('Edit')).toBeUndefined();
  });
});
