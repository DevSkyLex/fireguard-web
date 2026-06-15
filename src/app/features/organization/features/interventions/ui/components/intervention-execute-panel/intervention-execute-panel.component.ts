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
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { ScrollerModule } from 'primeng/scroller';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import type {
  InterventionDiscoveryRequest,
  InterventionOutput,
  InterventionPhotoAttachment,
  InterventionWorkItemAction,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';

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
    DrawerModule,
    FormsModule,
    MessageModule,
    ScrollerModule,
    SelectModule,
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
  public readonly intervention: InputSignal<InterventionOutput> = input.required<InterventionOutput>();

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
  public readonly progress: InputSignal<number> = input(0);

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
  public readonly saving: InputSignal<boolean> = input(false);

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
  public readonly canSubmit: InputSignal<boolean> = input(false);

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
  public readonly canExecute: InputSignal<boolean> = input(false);

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
  public readonly scanSupported: InputSignal<boolean> = input(false);

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
   * Property file
   * @readonly
   *
   * @description
   * Provides the file value.
   *
   * @type {File}
   */

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Provides the equipment id value.
   *
   * @type {string}
   */

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
  protected readonly scrollerItems: Signal<InterventionWorkItemOutput[]> = computed(() => [
    ...this.workItems(),
  ]);

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
  protected readonly skipDrawerVisible: WritableSignal<boolean> = signal(false);

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
  protected readonly discoveryDrawerVisible: WritableSignal<boolean> = signal(false);

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
   * Property skipReason
   * @readonly
   *
   * @description
   * Provides the skip reason value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly skipReason: WritableSignal<string> = signal('');

  /**
   * Property discoveryAction
   * @readonly
   *
   * @description
   * Provides the discovery action value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionWorkItemAction>}
   */
  protected readonly discoveryAction: WritableSignal<InterventionWorkItemAction> =
    signal<InterventionWorkItemAction>('inventory');

  /**
   * Property discoveryTarget
   * @readonly
   *
   * @description
   * Provides the discovery target value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly discoveryTarget: WritableSignal<string> = signal('');

  /**
   * Property discoveryResult
   * @readonly
   *
   * @description
   * Initial inspection result used when a field inspection is discovered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionResult>}
   */
  protected readonly discoveryResult: WritableSignal<InspectionResult> =
    signal<InspectionResult>('pass');

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
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {InterventionWorkItemAction}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property actionOptions
   * @readonly
   *
   * @description
   * Provides the action options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly { label: string; value: InterventionWorkItemAction }[]}
   */
  protected readonly actionOptions: readonly { label: string; value: InterventionWorkItemAction }[] = [
    { label: 'Site setup', value: 'site_setup' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Inspection', value: 'inspection' },
  ];

  /**
   * Property resultOptions
   * @readonly
   *
   * @description
   * Available initial inspection results.
   *
   * @access protected
   * @since 1.0.0
   */
  protected readonly resultOptions: readonly { label: string; value: InspectionResult }[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

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
    this.skipReason.set('');
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
  protected confirmSkip(): void {
    const item = this.selectedWorkItem();
    const reason = this.skipReason().trim();
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
  protected confirmDiscovery(): void {
    this.createDiscovery.emit({
      action: this.discoveryAction(),
      target: this.discoveryTarget().trim() || null,
      result: this.discoveryResult(),
    });
    this.discoveryDrawerVisible.set(false);
    this.discoveryAction.set('inventory');
    this.discoveryTarget.set('');
    this.discoveryResult.set('pass');
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
