import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  resolveInterventionTag,
  type InterventionTagDescriptor,
  type InterventionTagKind,
} from '@features/organization/features/interventions/models';
import type { TagVariant } from '@shared/components';
import { InterventionTag } from '../intervention-tag.component';

type InterventionTagHarness = {
  readonly variant: () => TagVariant;
  readonly descriptor: () => InterventionTagDescriptor;
};

describe('InterventionTag', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionTag],
    }).overrideComponent(InterventionTag, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(kind: InterventionTagKind, value: string): InterventionTagHarness {
    const fixture = TestBed.createComponent(InterventionTag);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionTagHarness;
  }

  it('should create', () => {
    const component = createComponent('workItemStatus', 'planned');

    expect(component).toBeTruthy();
  });

  it('should default to the badge variant', () => {
    const component = createComponent('workItemStatus', 'planned');

    expect(component.variant()).toBe('badge');
  });

  it('should resolve the descriptor from the intervention registry', () => {
    const component = createComponent('status', 'draft');

    expect(component.descriptor()).toEqual(resolveInterventionTag('status', 'draft'));
  });
});
