import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import type { InterventionRequestChangesFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionReviewPanel } from '../intervention-review-panel.component';

type InterventionReviewPanelHarness = {
  confirmRequestChanges(values: InterventionRequestChangesFormValues): void;
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

  it("should emit the reviewer's captured note when changes are requested", () => {
    const component = createComponent();
    let emitted: string | undefined;
    component.requestChanges.subscribe((value) => (emitted = value));

    component.confirmRequestChanges({ note: 'Re-check the third-floor extinguishers.' });

    expect(emitted).toBe('Re-check the third-floor extinguishers.');
  });
});
