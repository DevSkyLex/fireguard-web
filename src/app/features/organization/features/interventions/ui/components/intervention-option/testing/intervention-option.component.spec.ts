import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  resolveInterventionTag,
  type InterventionTagDescriptor,
  type InterventionTagKind,
} from '@features/organization/features/interventions/models';
import { InterventionOption } from '../intervention-option.component';

type InterventionOptionHarness = {
  readonly descriptor: () => InterventionTagDescriptor;
};

describe('InterventionOption', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionOption],
    }).overrideComponent(InterventionOption, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(kind: InterventionTagKind, value: string): InterventionOptionHarness {
    const fixture = TestBed.createComponent(InterventionOption);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionOptionHarness;
  }

  it('should create', () => {
    const component = createComponent('workItemAction', 'inspection');

    expect(component).toBeTruthy();
  });

  it('should resolve the same descriptor as the badge for a given kind/value', () => {
    const component = createComponent('workItemAction', 'inspection');

    expect(component.descriptor()).toEqual(resolveInterventionTag('workItemAction', 'inspection'));
  });
});
