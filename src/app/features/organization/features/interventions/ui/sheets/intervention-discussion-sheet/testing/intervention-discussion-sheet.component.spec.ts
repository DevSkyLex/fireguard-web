import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
  type DebugElement,
  type InputSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HlmSheetImports } from '@shared/ui/sheet';
import { InterventionDiscussionSheet } from '../intervention-discussion-sheet.component';

/** Stands in for collaboration's `SubjectDiscussion` so this spec stays at the sheet's own boundary. */
@Component({
  selector: 'app-subject-discussion',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SubjectDiscussionStub {
  public readonly subjectType: InputSignal<string> = input.required<string>();
  public readonly subjectId: InputSignal<string> = input.required<string>();
  public readonly organizationId: InputSignal<string> = input.required<string>();
  public readonly active: InputSignal<boolean> = input<boolean>(false);
}

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-discussion-sheet"]');

describe('InterventionDiscussionSheet', () => {
  let fixture: ComponentFixture<InterventionDiscussionSheet>;
  let visibility: boolean[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.overrideComponent(InterventionDiscussionSheet, {
      set: { imports: [SubjectDiscussionStub, ...HlmSheetImports] },
    });

    fixture = TestBed.createComponent(InterventionDiscussionSheet);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('interventionId', 'intervention-1');
    await fixture.whenStable();

    visibility = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  });

  it('should stay closed until the page opens it', () => {
    expect(content()).toBeNull();
  });

  it('should render the title when the page opens it', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(content()).not.toBeNull();
    expect(content()?.textContent).toContain('Discussion');
  });

  it('should project the discussion with the intervention and organization forwarded', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const discussion: DebugElement | null = fixture.debugElement.query(
      By.directive(SubjectDiscussionStub),
    );

    expect(discussion).not.toBeNull();
    expect(discussion?.componentInstance.subjectType()).toBe('intervention');
    expect(discussion?.componentInstance.subjectId()).toBe('intervention-1');
    expect(discussion?.componentInstance.organizationId()).toBe('org-1');
    expect(discussion?.componentInstance.active()).toBe(true);
  });

  it('should emit visibleChange when the panel is dismissed', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
  });

  it('should not re-emit visibleChange for a state that already matches visible', () => {
    fixture.componentRef.setInput('visible', false);

    fixture.componentInstance['onStateChanged']('closed');

    expect(visibility).toEqual([]);
  });
});
