import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from '../empty-state.component';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state icon="pi-sitemap" title="No facilities yet" [description]="description">
      <button type="button">New facility</button>
    </app-empty-state>
  `,
})
class EmptyStateHost {
  public description?: string = 'Create a new facility to get started.';
}

describe('EmptyState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateHost],
    });
  });

  it('should render icon, title and description', () => {
    const fixture = TestBed.createComponent(EmptyStateHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('i.pi-sitemap')).toBeTruthy();
    expect(element.querySelector('h3')?.textContent).toContain('No facilities yet');
    expect(element.textContent).toContain('Create a new facility to get started.');
  });

  it('should omit the description when not provided', () => {
    const fixture = TestBed.createComponent(EmptyStateHost);
    fixture.componentInstance.description = undefined;
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('span')).toBeFalsy();
  });

  it('should project the action content', () => {
    const fixture = TestBed.createComponent(EmptyStateHost);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('button')?.textContent).toContain('New facility');
  });
});
