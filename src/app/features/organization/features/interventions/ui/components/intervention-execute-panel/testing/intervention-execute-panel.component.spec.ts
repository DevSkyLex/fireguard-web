import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ButtonPassThroughOptions } from 'primeng/button';
import type {
  InterventionDiscoveryRequest,
  InterventionOutput,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import type {
  InterventionDiscoveryFormValues,
  InterventionSkipFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { InterventionExecutePanel } from '../intervention-execute-panel.component';

type InterventionExecutePanelHarness = {
  openSkip(item: InterventionWorkItemOutput): void;
  confirmSkip(values: InterventionSkipFormValues): void;
  confirmDiscovery(values: InterventionDiscoveryFormValues): void;
  readonly fieldActionButtonPt: ButtonPassThroughOptions;
  readonly updateWorkItem: {
    subscribe(listener: (value: InterventionWorkItemStatusChange) => void): { unsubscribe(): void };
  };
  readonly createDiscovery: {
    subscribe(listener: (value: InterventionDiscoveryRequest) => void): { unsubscribe(): void };
  };
};

describe('InterventionExecutePanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionExecutePanel],
    }).overrideComponent(InterventionExecutePanel, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionExecutePanelHarness {
    const fixture = TestBed.createComponent(InterventionExecutePanel);
    fixture.componentRef.setInput('intervention', {} as InterventionOutput);
    fixture.componentRef.setInput('workItems', []);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionExecutePanelHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should emit a skip status change with a trimmed reason for the opened work item', () => {
    const component = createComponent();
    let emitted: InterventionWorkItemStatusChange | undefined;
    component.updateWorkItem.subscribe((value) => (emitted = value));

    component.openSkip({ id: 'wi-1' } as InterventionWorkItemOutput);
    component.confirmSkip({ reason: '  Locked plant room  ' } as InterventionSkipFormValues);

    expect(emitted).toEqual({
      workItemId: 'wi-1',
      status: 'skipped',
      skipReason: 'Locked plant room',
    });
  });

  it('should not emit a skip when no work item has been opened', () => {
    const component = createComponent();
    let calls = 0;
    component.updateWorkItem.subscribe(() => (calls += 1));

    component.confirmSkip({ reason: 'Locked' } as InterventionSkipFormValues);

    expect(calls).toBe(0);
  });

  it('should emit a discovery request with a trimmed target', () => {
    const component = createComponent();
    let emitted: InterventionDiscoveryRequest | undefined;
    component.createDiscovery.subscribe((value) => (emitted = value));

    component.confirmDiscovery({
      action: 'inspection',
      target: '  /api/equipment/1  ',
      result: 'pass',
    } as unknown as InterventionDiscoveryFormValues);

    expect(emitted).toEqual({ action: 'inspection', target: '/api/equipment/1', result: 'pass' });
  });
});
