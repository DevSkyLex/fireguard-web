import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  type DebugElement,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
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
  public readonly composerAutoFocus: InputSignal<boolean> = input<boolean>(false);
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
}

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-discussion-sheet"]');

const closeButton = (): HTMLButtonElement | null =>
  content()?.querySelector('[data-testid="intervention-discussion-sheet-close"]') ?? null;

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

describe('InterventionDiscussionSheet', () => {
  let fixture: ComponentFixture<InterventionDiscussionSheet>;
  let visibility: boolean[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideIcons({ lucideX })],
    });
    TestBed.overrideComponent(InterventionDiscussionSheet, {
      set: {
        imports: [
          SubjectDiscussionStub,
          UnsavedChangesDialog,
          HlmButton,
          NgIcon,
          ...HlmSheetImports,
        ],
      },
    });

    fixture = TestBed.createComponent(InterventionDiscussionSheet);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('interventionId', 'intervention-1');
    await fixture.whenStable();

    visibility = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  });

  /** Marks the embedded discussion dirty, as `SubjectDiscussion.dirtyChanged` would. */
  async function markDirty(): Promise<void> {
    const discussion: DebugElement | null = fixture.debugElement.query(
      By.directive(SubjectDiscussionStub),
    );
    const stub: SubjectDiscussionStub | undefined = discussion?.componentInstance;

    stub?.dirtyChanged.emit(true);
    await fixture.whenStable();
  }

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
    expect(discussion?.componentInstance.composerAutoFocus()).toBe(true);
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

  it('should close directly through its own close button when nothing is dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    closeButton()?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(unsavedChangesDialog()).toBeNull();
  });

  it('should block Escape instead of closing while the discussion is dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await markDirty();

    content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(content()).not.toBeNull();
    expect(unsavedChangesDialog()).not.toBeNull();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
  });

  it('should open the unsaved changes dialog instead of closing when its own close button is pressed while dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await markDirty();

    closeButton()?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close and discard once the reader confirms the unsaved changes dialog', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await markDirty();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should forget a stale draft once the panel has closed', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await markDirty();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });

  it('should stay open once the reader dismisses the unsaved changes dialog', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await markDirty();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesDismissed']();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });
});
