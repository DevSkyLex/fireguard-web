import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionReviewPanel } from '../intervention-review-panel.component';

type InterventionReviewPanelHarness = {
  requestCorrection(): void;
  readonly requestChanges: {
    subscribe(listener: (value: string) => void): { unsubscribe(): void };
  };
};

describe('InterventionReviewPanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionReviewPanel],
    }).overrideComponent(InterventionReviewPanel, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionReviewPanelHarness {
    const fixture = TestBed.createComponent(InterventionReviewPanel);
    fixture.componentRef.setInput('intervention', {} as InterventionOutput);
    fixture.componentRef.setInput('issues', []);
    fixture.componentRef.setInput('changes', []);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionReviewPanelHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should emit a correction request with guidance when changes are requested', () => {
    const component = createComponent();
    let emitted: string | undefined;
    component.requestChanges.subscribe((value) => (emitted = value));

    component.requestCorrection();

    expect(emitted).toContain('review findings');
  });
});
