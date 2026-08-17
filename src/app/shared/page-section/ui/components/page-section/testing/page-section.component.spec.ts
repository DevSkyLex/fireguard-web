import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageSection } from '../page-section.component';

@Component({
  imports: [PageSection],
  template: `
    <app-page-section heading="Members" description="Who can access this organization.">
      <button type="button" pageSectionAction>Invite</button>
      <p>Body content</p>
    </app-page-section>
  `,
})
class PageSectionHost {}

describe('PageSection', () => {
  let fixture: ComponentFixture<PageSection>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PageSection);
    fixture.componentRef.setInput('heading', 'Members');
    await fixture.whenStable();
  });

  it('should render the heading text in an h2', () => {
    const heading: HTMLHeadingElement | null = fixture.nativeElement.querySelector('h2');

    expect(heading?.textContent).toContain('Members');
  });

  it('should wire the section aria-labelledby to the heading id', () => {
    const section: HTMLElement | null = fixture.nativeElement.querySelector('section');
    const heading: HTMLHeadingElement | null = fixture.nativeElement.querySelector('h2');

    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(heading?.id).toBeTruthy();
  });

  it('should honor an explicit headingId input', async () => {
    fixture.componentRef.setInput('headingId', 'members-section-title');
    await fixture.whenStable();

    const heading: HTMLHeadingElement | null = fixture.nativeElement.querySelector('h2');

    expect(heading?.id).toBe('members-section-title');
  });

  it('should omit the description when none is given', () => {
    const description: HTMLParagraphElement | null = fixture.nativeElement.querySelector('p');

    expect(description).toBeNull();
  });

  it('should render the description when given', async () => {
    fixture.componentRef.setInput('description', 'Who can access this organization.');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Who can access this organization.');
  });
});

describe('PageSection projection', () => {
  let hostFixture: ComponentFixture<PageSectionHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    hostFixture = TestBed.createComponent(PageSectionHost);
    await hostFixture.whenStable();
  });

  it('should project the action slot into the header row', () => {
    const action: HTMLButtonElement | null = hostFixture.nativeElement.querySelector('button');

    expect(action?.textContent).toContain('Invite');
  });

  it('should project default content as the section body', () => {
    expect(hostFixture.nativeElement.textContent).toContain('Body content');
  });
});
