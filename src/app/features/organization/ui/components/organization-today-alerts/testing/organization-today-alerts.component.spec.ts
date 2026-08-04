import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TodayAlertRow } from '../models';
import { OrganizationTodayAlerts } from '../organization-today-alerts.component';

const ROW: TodayAlertRow = {
  id: 'interventions-overdue',
  label: 'Interventions past their due date',
  count: 3,
  severity: 'danger',
  icon: 'pi pi-clock',
  navigable: true,
};

describe('OrganizationTodayAlerts', () => {
  let fixture: ComponentFixture<OrganizationTodayAlerts>;

  const render = (rows: readonly TodayAlertRow[], loading = false, hasError = false) => {
    fixture = TestBed.createComponent(OrganizationTodayAlerts);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('hasError', hasError);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrganizationTodayAlerts] });
  });

  it('should render one button per navigable row and emit its id when activated', () => {
    render([ROW]);

    const buttons = fixture.debugElement.queryAll(By.css('li button'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0].nativeElement.textContent).toContain('Interventions past their due date');
    expect(buttons[0].nativeElement.textContent).toContain('3');

    let emitted: string | undefined;
    fixture.componentInstance.selected.subscribe((id: string) => (emitted = id));
    buttons[0].nativeElement.click();

    expect(emitted).toBe('interventions-overdue');
  });

  it('should render a non-navigable row as plain content rather than a button', () => {
    render([{ ...ROW, navigable: false }]);

    expect(fixture.debugElement.queryAll(By.css('li button'))).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Interventions past their due date');
  });

  it('should render nothing at all when the feed is empty, leaving the all-clear to the page', () => {
    render([]);

    expect(fixture.debugElement.queryAll(By.css('li'))).toHaveLength(0);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should surface the error state and emit a retry', () => {
    render([ROW], false, true);

    expect(fixture.debugElement.queryAll(By.css('li'))).toHaveLength(0);

    let retried = false;
    fixture.componentInstance.retried.subscribe(() => (retried = true));
    fixture.debugElement.query(By.css('button.p-button')).nativeElement.click();

    expect(retried).toBe(true);
  });
});
