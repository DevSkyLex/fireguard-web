import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { CommentComposer } from '../comment-composer.component';

/**
 * Minimal view onto the component's protected members so the pure composer
 * logic can be exercised without instantiating the Quill editor (which needs a
 * real browser DOM the unit environment does not provide).
 */
interface TestableComposer {
  draftHtml: string;
  readonly plainLength: () => number;
  readonly canSubmit: () => boolean;
  onTextChange(event: { htmlValue: string; textValue: string }): void;
  submit(): void;
  onKeydown(event: KeyboardEvent): void;
}

function createComposer(): ComponentFixture<CommentComposer> {
  TestBed.configureTestingModule({});
  // Stub the template so the heavy Quill editor is not mounted in jsdom.
  TestBed.overrideComponent(CommentComposer, { set: { template: '' } });
  const fixture = TestBed.createComponent(CommentComposer);
  fixture.detectChanges();

  return fixture;
}

function testable(fixture: ComponentFixture<CommentComposer>): TestableComposer {
  return fixture.componentInstance as unknown as TestableComposer;
}

describe('CommentComposer', () => {
  it('emits the draft HTML and clears the editor on submit', () => {
    const fixture = createComposer();
    const submitted: string[] = [];
    fixture.componentInstance.submitted.subscribe((value: string) => submitted.push(value));

    const composer = testable(fixture);
    composer.draftHtml = '<p>Looks good</p>';
    composer.onTextChange({ htmlValue: '<p>Looks good</p>', textValue: 'Looks good' });
    expect(composer.canSubmit()).toBe(true);

    composer.submit();

    expect(submitted).toEqual(['<p>Looks good</p>']);
    expect(composer.draftHtml).toBe('');
    expect(composer.plainLength()).toBe(0);
  });

  it('does not submit a blank draft (Quill empty output)', () => {
    const fixture = createComposer();
    const submitted: string[] = [];
    fixture.componentInstance.submitted.subscribe((value: string) => submitted.push(value));

    const composer = testable(fixture);
    composer.draftHtml = '<p><br></p>';
    composer.onTextChange({ htmlValue: '<p><br></p>', textValue: '\n' });

    expect(composer.canSubmit()).toBe(false);
    composer.submit();
    expect(submitted).toEqual([]);
  });

  it('blocks submission while pending', () => {
    const fixture = createComposer();
    const composer = testable(fixture);
    composer.onTextChange({ htmlValue: '<p>Quick note</p>', textValue: 'Quick note' });
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();

    expect(composer.canSubmit()).toBe(false);
  });

  it('submits on Ctrl+Enter', () => {
    const fixture = createComposer();
    const submitted: string[] = [];
    fixture.componentInstance.submitted.subscribe((value: string) => submitted.push(value));

    const composer = testable(fixture);
    composer.draftHtml = '<p>Quick note</p>';
    composer.onTextChange({ htmlValue: '<p>Quick note</p>', textValue: 'Quick note' });
    composer.onKeydown(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));

    expect(submitted).toEqual(['<p>Quick note</p>']);
  });
});
