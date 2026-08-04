import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {
  resolveEquipmentTag,
  type EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { PageHeader } from '@shared/page-header';
import { type TagDescriptor } from '@shared/tag';

/**
 * The band's single named forward transition for the equipment's current
 * status. Absent (`null`) once the equipment is decommissioned — a terminal
 * status has no forward action left to name.
 */
interface LifecycleAction {
  /** Button label, e.g. `"Commission"`. */
  readonly label: string;
  /** PrimeIcons class shown on the button. */
  readonly icon: string;
  /** `warn` for the maintenance transition; unset for the default/primary look. */
  readonly severity: 'warn' | undefined;
  /** Whether the transition is currently blocked. */
  readonly disabled: boolean;
  /** Reason the transition is blocked, surfaced next to the button so the gate never dead-ends silently; null while enabled. */
  readonly disabledReason: string | null;
  /** Invokes the transition's output. */
  readonly run: () => void;
}

/**
 * Header presenting equipment identity, status and lifecycle actions.
 */
@Component({
  selector: 'app-equipment-detail-header',
  imports: [AvatarModule, ButtonModule, DatePipe, PageHeader, TagModule],
  templateUrl: './equipment-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailHeader {
  /** Equipment presented by the header. */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required();
  /** Human-readable equipment type (underscores replaced), title-cased in {@link headerTitle}. */
  private readonly typeLabel: Signal<string> = computed((): string =>
    this.equipment().type.replace(/_/g, ' '),
  );
  /** Whether the active member can mutate equipment. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether a lifecycle transition is pending. */
  public readonly lifecycleLoading: InputSignal<boolean> = input(false);
  /** Emits an equipment commission request. */
  public readonly commission: OutputEmitterRef<void> = output();
  /** Emits an equipment maintenance request. */
  public readonly maintenance: OutputEmitterRef<void> = output();
  /** Emits an equipment decommission request. */
  public readonly decommission: OutputEmitterRef<void> = output();

  /** Pipe instance used to title-case {@link typeLabel} for {@link headerTitle}. */
  private readonly titleCasePipe: TitleCasePipe = new TitleCasePipe();

  /** `app-page-header` title: title-cased type, brand, and model. */
  protected readonly headerTitle: Signal<string> = computed<string>(
    () =>
      `${this.titleCasePipe.transform(this.typeLabel())} ${this.equipment().brand} ${this.equipment().model}`,
  );

  /** Resolves the status badge descriptor for the equipment. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveEquipmentTag('status', status);
  }

  /**
   * Property lifecycleAction
   * @readonly
   *
   * @description
   * The lifecycle band's primary, named next action — the single relevant
   * forward transition for the equipment's current status: commission an
   * in-stock item, resume service after maintenance, or move an operational
   * one into maintenance. Replaces the previous menu of independently-gated
   * buttons (ARBITRAGES.md C5) with one line that always names what happens
   * next instead of listing every concurrent possibility.
   *
   * Exhaustive over {@link EquipmentOutput.status}'s four literals with no
   * `default` branch on purpose: a status added to the union later fails the
   * build here rather than silently falling through.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<LifecycleAction | null>}
   */
  protected readonly lifecycleAction: Signal<LifecycleAction | null> = computed(
    (): LifecycleAction | null => {
      const equipment: EquipmentOutput = this.equipment();

      switch (equipment.status) {
        case 'under_maintenance':
          return {
            label: $localize`:@@equipment.resumeService:Resume service`,
            icon: 'pi pi-check',
            severity: undefined,
            disabled: false,
            disabledReason: null,
            run: (): void => this.commission.emit(),
          };
        case 'operational':
          return {
            label: $localize`:@@equipment.maintenance:Maintenance`,
            icon: 'pi pi-wrench',
            severity: 'warn',
            disabled: false,
            disabledReason: null,
            run: (): void => this.maintenance.emit(),
          };
        case 'in_stock': {
          const disabled: boolean = !equipment.facilityId;

          return {
            label: $localize`:@@equipment.commission:Commission`,
            icon: 'pi pi-check',
            severity: undefined,
            disabled,
            disabledReason: disabled
              ? $localize`:@@equipment.commissionBlocked:Assign a facility before commissioning`
              : null,
            run: (): void => this.commission.emit(),
          };
        }
        case 'decommissioned':
          return null;
      }
    },
  );

  /**
   * Property canDecommission
   * @readonly
   *
   * @description
   * Whether the band's secondary action — Decommission — applies. Available
   * from every non-terminal status; absent once already decommissioned.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDecommission: Signal<boolean> = computed(
    (): boolean => this.equipment().status !== 'decommissioned',
  );
}
