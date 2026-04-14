import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FocusedLayout } from '../focused-layout.component';

describe('FocusedLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FocusedLayout],
      providers: [provideRouter([])],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FocusedLayout);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render router outlet inside centered content wrapper', () => {
    const fixture = TestBed.createComponent(FocusedLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('#focused-layout'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-header'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-content'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-focused-layout-footer'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('router-outlet'))).not.toBeNull();
  });
});

