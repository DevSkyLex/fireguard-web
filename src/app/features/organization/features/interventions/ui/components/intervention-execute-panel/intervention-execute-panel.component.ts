import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { ScrollerModule } from 'primeng/scroller';
import { TagModule } from 'primeng/tag';
import type {
  InterventionDiscoveryRequest,
  InterventionOutput,
  InterventionPhotoAttachment,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import {
  InterventionDiscoveryForm,
  InterventionSkipForm,
  type InterventionDiscoveryFormValues,
  type InterventionSkipFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { Card, EmptyState } from '@shared/components';

/**
 * Component InterventionExecutePanel
 * @class InterventionExecutePanel
 *
 * @description
 * Renders the intervention execute workflow panel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-execute-panel',
  imports: [
    ButtonModule,
    Card,
    DrawerModule,
    EmptyState,
    InterventionDiscoveryForm,
    InterventionSkipForm,
    InterventionTag,
    MessageModule,
    ScrollerModule,
    TagModule,
  ],
  templateUrl: './intervention-execute-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionExecutePanel {
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Provides the intervention value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Provides the work items value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Property nextWorkItem
   * @readonly
   *
   * @description
   * Provides the next work item value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionWorkItemOutput | null>}
   */
  public readonly nextWorkItem: InputSignal<InterventionWorkItemOutput | null> =
    input<InterventionWorkItemOutput | null>(null);

  /**
   * Property progress
   * @readonly
   *
   * @description
   * Provides the progress value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly progress: InputSignal<number> = input<number>(0);

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Provides the saving value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Provides the can submit value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canSubmit: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canExecute
   * @readonly
   *
   * @description
   * Whether the current user may perform field execution actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canExecute: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property scanSupported
   * @readonly
   *
   * @description
   * Provides the scan supported value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly scanSupported: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property fieldMessage
   * @readonly
   *
   * @description
   * Provides the field message value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly fieldMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Valid equipment type choices forwarded to the discovery form so an
   * `inventory` discovery always submits an accepted equipment type.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly equipmentTypeOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property updateWorkItem
   * @readonly
   *
   * @description
   * Provides the update work item value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {typeof updateWorkItem}
   */
  public readonly updateWorkItem: OutputEmitterRef<InterventionWorkItemStatusChange> =
    output<InterventionWorkItemStatusChange>();

  /**
   * Property createDiscovery
   * @readonly
   *
   * @description
   * Provides the create discovery value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {typeof createDiscovery}
   */
  public readonly createDiscovery: OutputEmitterRef<InterventionDiscoveryRequest> =
    output<InterventionDiscoveryRequest>();

  /**
   * Property scanPhoto
   * @readonly
   *
   * @description
   * Provides the scan photo value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<File>}
   */
  public readonly scanPhoto: OutputEmitterRef<File> = output<File>();

  /**
   * Property attachPhoto
   * @readonly
   *
   * @description
   * Provides the attach photo value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{ equipmentId: string; file: File }>}
   */
  public readonly attachPhoto: OutputEmitterRef<InterventionPhotoAttachment> =
    output<InterventionPhotoAttachment>();

  /**
   * Property submitIntervention
   * @readonly
   *
   * @description
   * Provides the submit intervention value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly submitIntervention: OutputEmitterRef<void> = output<void>();

  /**
   * Property scrollerItems
   * @readonly
   *
   * @description
   * Provides the scroller items value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionWorkItemOutput[]>}
   */
  protected readonly scrollerItems: Signal<InterventionWorkItemOutput[]> = computed<
    InterventionWorkItemOutput[]
  >(() => [...this.workItems()]);

  /**
   * Property skipDrawerVisible
   * @readonly
   *
   * @description
   * Provides the skip drawer visible value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly skipDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property discoveryDrawerVisible
   * @readonly
   *
   * @description
   * Provides the discovery drawer visible value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discoveryDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property selectedWorkItem
   * @readonly
   *
   * @description
   * Provides the selected work item value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionWorkItemOutput | null>}
   */
  protected readonly selectedWorkItem: WritableSignal<InterventionWorkItemOutput | null> =
    signal<InterventionWorkItemOutput | null>(null);

  /**
   * Property photoEquipmentId
   * @readonly
   *
   * @description
   * Provides the photo equipment id value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly photoEquipmentId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Method openSkip
   * @method openSkip
   *
   * @description
   * Executes the open skip operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - item value.
   *
   * @return {void} Result of the open skip operation.
   */
  protected openSkip(item: InterventionWorkItemOutput): void {
    this.selectedWorkItem.set(item);
    this.skipDrawerVisible.set(true);
  }

  /**
   * Method confirmSkip
   * @method confirmSkip
   *
   * @description
   * Executes the confirm skip operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the confirm skip operation.
   */
  protected confirmSkip(values: InterventionSkipFormValues): void {
    const item = this.selectedWorkItem();
    const reason = values.reason.trim();
    if (!item || !reason) return;
    this.updateWorkItem.emit({ workItemId: item.id, status: 'skipped', skipReason: reason });
    this.skipDrawerVisible.set(false);
  }

  /**
   * Method confirmDiscovery
   * @method confirmDiscovery
   *
   * @description
   * Executes the confirm discovery operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the confirm discovery operation.
   */
  protected confirmDiscovery(values: InterventionDiscoveryFormValues): void {
    this.createDiscovery.emit({
      action: values.action,
      target: values.target.trim() || null,
      result: values.result,
    });
    this.discoveryDrawerVisible.set(false);
  }

  /**
   * Method captureScan
   * @method captureScan
   *
   * @description
   * Executes the capture scan operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - event value.
   *
   * @return {void} Result of the capture scan operation.
   */
  protected captureScan(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) this.scanPhoto.emit(file);
    fileInput.value = '';
  }

  /**
   * Method openPhotoCapture
   * @method openPhotoCapture
   *
   * @description
   * Executes the open photo capture operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - item value.
   * @param {HTMLInputElement} fileInput - file Input value.
   *
   * @return {void} Result of the open photo capture operation.
   */
  protected openPhotoCapture(item: InterventionWorkItemOutput, fileInput: HTMLInputElement): void {
    const equipmentId = this.equipmentId(item.target);
    if (!equipmentId) return;
    this.photoEquipmentId.set(equipmentId);
    fileInput.click();
  }

  /**
   * Method capturePhoto
   * @method capturePhoto
   *
   * @description
   * Executes the capture photo operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - event value.
   *
   * @return {void} Result of the capture photo operation.
   */
  protected capturePhoto(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    const equipmentId = this.photoEquipmentId();
    if (file && equipmentId) this.attachPhoto.emit({ equipmentId, file });
    this.photoEquipmentId.set(null);
    fileInput.value = '';
  }

  /**
   * Method isEquipmentTarget
   * @method isEquipmentTarget
   *
   * @description
   * Executes the is equipment target operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} target - target value.
   *
   * @return {boolean} Result of the is equipment target operation.
   */
  protected isEquipmentTarget(target: string | null): boolean {
    return this.equipmentId(target) !== null;
  }

  /**
   * Method equipmentId
   * @method equipmentId
   *
   * @description
   * Executes the equipment id operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} target - target value.
   *
   * @return {string | null} Result of the equipment id operation.
   */
  private equipmentId(target: string | null): string | null {
    const match = target?.match(/^\/api\/equipment\/([^/?#]+)$/);
    return match?.[1] ?? null;
  }
}
