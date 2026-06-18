import { DatePipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import type { TableLazyLoadEvent } from 'primeng/table';
import type {
  InterventionListOptions,
  InterventionType,
} from '@features/organization/features/interventions/models';
import { InterventionTable } from '../intervention-table.component';
import { getInterventionTypeIcon } from '../utils';

type InterventionTableHarness = {
  onLazyLoad(event: TableLazyLoadEvent): void;
  getTypeIcon(type: InterventionType): string;
  readonly load: {
    subscribe(listener: (value: InterventionListOptions) => void): { unsubscribe(): void };
  };
  readonly pageChange: {
    subscribe(listener: (value: number) => void): { unsubscribe(): void };
  };
};

describe('InterventionTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionTable],
    }).overrideComponent(InterventionTable, {
      set: {
        imports: [ReactiveFormsModule, DatePipe],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(): InterventionTableHarness {
    const fixture = TestBed.createComponent(InterventionTable);
    fixture.componentRef.setInput('interventions', []);
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionTableHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should normalize a lazy-load event into one-based, sorted request options', () => {
    const component = createComponent();
    let loaded: InterventionListOptions | undefined;
    component.load.subscribe((value) => (loaded = value));

    component.onLazyLoad({ first: 24, rows: 12, sortField: 'name', sortOrder: 1 });

    expect(loaded).toEqual({ page: 3, itemsPerPage: 12, order: { name: 'asc' } });
  });

  it('should emit a page change only after the initial lazy load', () => {
    const component = createComponent();
    const pages: number[] = [];
    component.pageChange.subscribe((page) => pages.push(page));

    component.onLazyLoad({ first: 0, rows: 12 });
    component.onLazyLoad({ first: 12, rows: 12 });

    expect(pages).toEqual([2]);
  });

  it('should resolve the objective-type icon through the shared util', () => {
    const component = createComponent();

    expect(component.getTypeIcon('inspection' as InterventionType)).toBe(
      getInterventionTypeIcon('inspection' as InterventionType),
    );
  });
});
