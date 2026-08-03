import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorBanner } from '../error-banner.component';

@Component({
  imports: [ErrorBanner],
  template: `
    <app-error-banner
      [message]="message"
      [retryable]="retryable"
      [retrying]="retrying"
      (retried)="onRetried()"
    />
  `,
})
class ErrorBannerHost {
  public message: string = 'The facilities could not be loaded.';
  public retryable: boolean = true;
  public retrying: boolean = false;
  public retriedCount: number = 0;

  public onRetried(): void {
    this.retriedCount++;
  }
}

describe('ErrorBanner', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ErrorBannerHost],
    });
  });

  it('should render the message', () => {
    const fixture = TestBed.createComponent(ErrorBannerHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('The facilities could not be loaded.');
  });

  it('should emit retried when the retry button is clicked', () => {
    const fixture = TestBed.createComponent(ErrorBannerHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('button')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.retriedCount).toBe(1);
  });

  it('should hide the retry button when retryable is false', () => {
    const fixture = TestBed.createComponent(ErrorBannerHost);
    fixture.componentInstance.retryable = false;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('button')).toBeFalsy();
  });

  it('should show the loading state on the retry button while retrying', () => {
    const fixture = TestBed.createComponent(ErrorBannerHost);
    fixture.componentInstance.retrying = true;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.p-button-loading')).toBeTruthy();
  });
});
