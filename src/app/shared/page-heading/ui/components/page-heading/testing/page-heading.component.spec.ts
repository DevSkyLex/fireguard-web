import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageHeading } from '../page-heading.component';

@Component({
  imports: [PageHeading],
  template: `
    <app-page-heading heading="Two-factor verification">
      <p data-testid="projected">We sent a code to jane@example.com</p>
    </app-page-heading>
  `,
})
class PageHeadingProjectionHost {}

describe('PageHeading', () => {
  let fixture: ComponentFixture<PageHeading>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PageHeading);
    fixture.componentRef.setInput('heading', 'Sign in');
    await fixture.whenStable();
  });

  it('should render the heading as an h1', () => {
    const heading: HTMLHeadingElement = fixture.nativeElement.querySelector('h1');

    expect(heading.textContent?.trim()).toBe('Sign in');
    expect(heading.className).toBe('text-2xl font-semibold tracking-tight text-foreground');
  });

  it('should preserve the header wrapper classes', () => {
    const header: HTMLElement = fixture.nativeElement.querySelector('header');

    expect(header.className).toBe('flex flex-col gap-1.5');
  });

  it('should omit the description when none is given', () => {
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('should render the description when given', async () => {
    fixture.componentRef.setInput('description', 'Access your Fireguard workspace.');
    await fixture.whenStable();

    const description: HTMLParagraphElement = fixture.nativeElement.querySelector('p');

    expect(description.textContent?.trim()).toBe('Access your Fireguard workspace.');
    expect(description.className).toBe('text-sm text-muted-foreground');
  });

  it('should project rich content into the header', async () => {
    const hostFixture: ComponentFixture<PageHeadingProjectionHost> =
      TestBed.createComponent(PageHeadingProjectionHost);
    await hostFixture.whenStable();

    const projected: HTMLElement = hostFixture.nativeElement.querySelector(
      '[data-testid="projected"]',
    );

    expect(projected.closest('header')).not.toBeNull();
    expect(projected.textContent).toBe('We sent a code to jane@example.com');
  });
});
