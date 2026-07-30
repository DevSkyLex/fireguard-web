import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorState } from '../error-state.component';

@Component({
  imports: [ErrorState],
  template: `
    <app-error-state [icon]="icon" title="Couldn't load facilities" [description]="description">
      <button type="button">Retry</button>
    </app-error-state>
  `,
})
class ErrorStateHost {
  public icon: string = 'pi-wifi';
  public description?: string = 'Check your connection and try again.';
}

@Component({
  imports: [ErrorState],
  template: `<app-error-state title="Couldn't load facilities" />`,
})
class ErrorStateDefaultIconHost {}

describe('ErrorState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ErrorStateHost, ErrorStateDefaultIconHost],
    });
  });

  it('should render the icon, title and description', () => {
    const fixture = TestBed.createComponent(ErrorStateHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('i.pi-wifi')).toBeTruthy();
    expect(element.querySelector('h3')?.textContent).toContain("Couldn't load facilities");
    expect(element.textContent).toContain('Check your connection and try again.');
  });

  it('should fall back to the warning triangle icon when none is provided', () => {
    const fixture = TestBed.createComponent(ErrorStateDefaultIconHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('i.pi-exclamation-triangle')).toBeTruthy();
  });

  it('should omit the description when not provided', () => {
    const fixture = TestBed.createComponent(ErrorStateHost);
    fixture.componentInstance.description = undefined;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p')).toBeFalsy();
  });

  it('should project the retry action', () => {
    const fixture = TestBed.createComponent(ErrorStateHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('button')?.textContent).toContain('Retry');
  });
});
