import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SplitLayout } from '../split-layout.component';

describe('SplitLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitLayout],
      providers: [provideRouter([])],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SplitLayout);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render all layout components and router outlet', () => {
    const fixture = TestBed.createComponent(SplitLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-split-layout-showcase'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-split-layout-header'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-split-layout-content'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-split-layout-footer'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('router-outlet'))).not.toBeNull();
  });
});
