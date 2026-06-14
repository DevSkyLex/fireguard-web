import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TablePassThroughOptions } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { EmptyState } from '@shared/components';

/**
 * Constant INTERVENTION_NAME_MAX_LENGTH
 * @const INTERVENTION_NAME_MAX_LENGTH
 *
 * @description
 * Maximum length accepted for a intervention name.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const INTERVENTION_NAME_MAX_LENGTH = 160;

/**
 * Constant SKELETON_ROW_COUNT
 * @const SKELETON_ROW_COUNT
 *
 * @description
 * Number of placeholder rows rendered while the list is loading.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const SKELETON_ROW_COUNT = 5;

/**
 * Component InterventionTable
 * @class InterventionTable
 *
 * @description
 * Presentational intervention table used by the intervention list route page.
 * Owns only local form and table UI state while delegating loading,
 * navigation and creation orchestration to the parent page through outputs.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    InputTextModule,
    ReactiveFormsModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './intervention-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTable {
  //#region Inputs
  /**
   * Input interventions
   * @readonly
   *
   * @description
   * Intervention rows currently displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Input total
   * @readonly
   *
   * @description
   * Total number of interventions for the active organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly total: InputSignal<number> = input.required<number>();

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether the intervention list is currently loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input creating
   * @readonly
   *
   * @description
   * Whether intervention creation is currently in-flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly creating: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input empty
   * @readonly
   *
   * @description
   * Whether the active organization has no interventions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();
  //#endregion

  //#region Outputs
  /**
   * Output refresh
   * @readonly
   *
   * @description
   * Requests a list refresh from the parent page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly refresh: OutputEmitterRef<void> = output<void>();

  /**
   * Output view
   * @readonly
   *
   * @description
   * Emits a intervention selected for detail navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly view: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Output create
   * @readonly
   *
   * @description
   * Emits the intervention name requested by the creation form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly create: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes used for full-height table layout.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: {
      class: 'p-0 flex flex-col flex-1 min-h-0',
    },
  };

  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes aligned with organization tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
   */
  protected readonly tablePt: TablePassThroughOptions = {
    root: {
      class: 'flex min-h-0 flex-1 flex-col',
    },
    tableContainer: {
      class: 'flex-1 min-h-0 rounded-b-xl overflow-hidden',
    },
    table: {
      class: 'text-sm',
    },
    tbody: {
      // No paginator closes this table: the last row would otherwise
      // stack its own border on top of the card border.
      class: '[&>tr:last-child>td]:border-b-0!',
    },
  };

  /**
   * Property nameControl
   * @readonly
   *
   * @description
   * Intervention name control used by the create form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly nameControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(INTERVENTION_NAME_MAX_LENGTH)],
  });

  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Placeholder rows rendered while the list is loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(SKELETON_ROW_COUNT);
  //#endregion

  //#region Methods
  /**
   * Method onCreate
   * @method onCreate
   *
   * @description
   * Emits a create request when the intervention name is valid and no creation is
   * already in-flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onCreate(): void {
    if (this.nameControl.invalid || this.creating()) {
      return;
    }

    this.create.emit(this.nameControl.value.trim());
  }

  /**
   * Method onRefresh
   * @method onRefresh
   *
   * @description
   * Emits a refresh request to the parent page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected onRefresh(): void {
    this.refresh.emit();
  }
  //#endregion
}
