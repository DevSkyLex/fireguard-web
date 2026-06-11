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
import type { MissionOutput } from '@features/organization/features/missions/models';

/**
 * Component MissionTable
 * @class MissionTable
 *
 * @description
 * Presentational mission table used by the mission list route page.
 * Owns only local form and table UI state while delegating loading,
 * navigation and creation orchestration to the parent page through outputs.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mission-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    InputTextModule,
    ReactiveFormsModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './mission-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionTable {
  //#region Inputs
  /** Mission rows currently displayed. */
  public readonly missions: InputSignal<readonly MissionOutput[]> =
    input.required<readonly MissionOutput[]>();

  /** Total number of missions for the active organization. */
  public readonly total: InputSignal<number> = input.required<number>();

  /** Whether the list is currently loading. */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /** Whether mission creation is currently in-flight. */
  public readonly creating: InputSignal<boolean> = input.required<boolean>();

  /** Whether the active organization has no missions. */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();
  //#endregion

  //#region Outputs
  /** Requests a list refresh from the parent page. */
  public readonly refresh: OutputEmitterRef<void> = output<void>();

  /** Emits a mission selected for detail navigation. */
  public readonly view: OutputEmitterRef<MissionOutput> = output<MissionOutput>();

  /** Emits the mission name requested by the creation form. */
  public readonly create: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** PrimeNG card pass-through classes used for full-height table layout. */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: {
      class: 'p-0 flex flex-col flex-1 min-h-0',
    },
  };

  /** PrimeNG table pass-through classes aligned with organization tables. */
  protected readonly tablePt: TablePassThroughOptions = {
    root: {
      class: 'flex min-h-0 flex-1 flex-col',
    },
    tableContainer: {
      class: 'flex-1 min-h-0',
    },
    table: {
      class: 'text-sm',
    },
  };

  /** Mission name control used by the create form. */
  protected readonly nameControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });

  /** Placeholder rows rendered while the list is loading. */
  protected readonly skeletonItems: undefined[] = Array(5);
  //#endregion

  //#region Methods
  /** Emits a create request when the mission name is valid. */
  protected onCreate(): void {
    if (this.nameControl.invalid || this.creating()) {
      return;
    }

    this.create.emit(this.nameControl.value.trim());
  }

  /** Emits a refresh request to the parent page. */
  protected onRefresh(): void {
    this.refresh.emit();
  }
  //#endregion
}
