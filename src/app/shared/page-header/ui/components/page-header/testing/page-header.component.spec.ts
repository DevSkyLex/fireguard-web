import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from '../page-header.component';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="Settings" [subtitle]="subtitle">
      <button type="button" actions>Save</button>
    </app-page-header>
  `,
})
class PageHeaderHost {
  public subtitle?: string = 'Manage workspace preferences.';
}

describe('PageHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageHeaderHost],
    });
  });

  it('should render the required title in an h1', () => {
    const fixture = TestBed.createComponent(PageHeaderHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('Settings');
  });

  it('should render the subtitle when provided', () => {
    const fixture = TestBed.createComponent(PageHeaderHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p')?.textContent).toContain('Manage workspace preferences.');
  });

  it('should omit the subtitle element when not provided', () => {
    const fixture = TestBed.createComponent(PageHeaderHost);
    fixture.componentInstance.subtitle = undefined;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('p')).toBeFalsy();
  });

  it('should project the actions content', () => {
    const fixture = TestBed.createComponent(PageHeaderHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('button')?.textContent).toContain('Save');
  });
});
