import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionPublicationSummary } from '../intervention-publication-summary.component';

describe('InterventionPublicationSummary', () => {
  let fixture: ComponentFixture<InterventionPublicationSummary>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionPublicationSummary);
    fixture.componentRef.setInput('pendingChanges', 4);
    fixture.componentRef.setInput('inspections', 12);
    fixture.componentRef.setInput('revision', 7);
    await fixture.whenStable();
  });

  it('should state what publication is about to write', () => {
    expect(root().textContent).toContain('4');
    expect(root().textContent).toContain('12');
    expect(root().textContent).toContain('v7');
  });

  it('should restate the atomic contract, which is the point of the recap', () => {
    expect(root().textContent).toContain('Either everything succeeds, or no record is modified.');
  });

  it('should stack its stats so one definition reads at rail and dialog width', () => {
    const rows: NodeListOf<Element> = root().querySelectorAll('dl > div');

    expect(rows).toHaveLength(3);
  });
});
