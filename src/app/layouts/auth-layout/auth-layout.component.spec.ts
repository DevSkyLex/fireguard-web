import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthLayout } from './auth-layout.component';

describe('AuthLayout', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthLayout],
      providers: [provideRouter([])],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthLayout);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should render all layout partials and router outlet', () => {
    const fixture = TestBed.createComponent(AuthLayout);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-auth-layout-showcase'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-auth-layout-header'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-auth-layout-content'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('app-auth-layout-footer'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('router-outlet'))).not.toBeNull();
  });
});
