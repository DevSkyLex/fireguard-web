import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityMoveDialog } from '../facility-move-dialog.component';

describe('FacilityMoveDialog', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacilityMoveDialog],
    }).overrideComponent(FacilityMoveDialog, {
      set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(FacilityMoveDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('parentOptions', [
      { label: 'None (root level)', value: '' },
      { label: 'Building A', value: 'fac-a' },
    ]);
    fixture.componentRef.setInput('initialParentId', 'fac-a');
    fixture.detectChanges();
    return fixture;
  }

  it('should render with the picker seeded from initialParentId while visible', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.visible()).toBe(true);
    expect(component['selectedParentId']()).toBe('fac-a');
  });

  it('should emit confirmed with the selected parent id', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.confirmed.subscribe(spy);

    component['selectedParentId'].set('fac-b');
    component['confirm']();

    expect(spy).toHaveBeenCalledWith('fac-b');
  });

  it('should emit cancelled and close the dialog', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.cancelled.subscribe(spy);

    component['cancel']();

    expect(spy).toHaveBeenCalled();
    expect(component.visible()).toBe(false);
  });
});
