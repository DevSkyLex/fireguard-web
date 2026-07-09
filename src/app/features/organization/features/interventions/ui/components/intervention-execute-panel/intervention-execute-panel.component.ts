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
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import type {
  InterventionDiscoveryRequest,
  InterventionOutput,
  InterventionPhotoAttachment,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
  SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionReadinessChecklist,
  type InterventionReadinessCheck,
} from '@features/organization/features/interventions/ui/components/intervention-readiness-checklist';
import {
  InterventionSubstepNav,
  type InterventionSubstep,
} from '@features/organization/features/interventions/ui/components/intervention-substep-nav';
import {
  InterventionDiscoveryDrawer,
  InterventionSkipDrawer,
} from '@features/organization/features/interventions/ui/drawers';
import type {
  InterventionDiscoveryFormValues,
  InterventionSkipFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { InterventionFieldWorkTable } from '@features/organization/features/interventions/ui/tables/intervention-field-work-table';

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
    CardModule,
    InterventionDiscoveryDrawer,
    InterventionFieldWorkTable,
    InterventionReadinessChecklist,
    InterventionSkipDrawer,
    InterventionSubstepNav,
    MessageModule,
  ],
  templateUrl: './intervention-execute-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionExecutePanel {
  /** Localized fallback label for a site-level (untargeted) work item. */
  protected readonly siteLevelLabel: string = $localize`:@@intervention.exec.siteLevel:Site-level work item`;
  /** Localized label for completing the in-progress work item. */
  protected readonly completeLabel: string = $localize`:@@intervention.exec.complete:Complete`;
  /** Localized label for starting the next work item. */
  protected readonly startWorkLabel: string = $localize`:@@intervention.exec.startWork:Start work`;

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
   * Property canAbandon
   * @readonly
   *
   * @description
   * Whether the intervention may be abandoned from this panel (workflow-legal and
   * permitted for the current user); resolved by the parent page. Gates the
   * destructive "Abandon" affordance.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canAbandon: InputSignal<boolean> = input<boolean>(false);

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
   * Property abandonIntervention
   * @readonly
   *
   * @description
   * Emits when the user asks to abandon the intervention, so the parent page can
   * confirm the destructive action and perform the transition.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly abandonIntervention: OutputEmitterRef<void> = output<void>();

  /**
   * Property nextTargetLabel
   * @readonly
   *
   * @description
   * Human-readable target of the next recommended action. Mirrors the field work
   * table's target resolution so the rail never exposes a raw resource IRI: the
   * API-embedded summary label first, then a free-text target, and null for an
   * unresolved resource IRI (rendered as site-level work by the template).
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly nextTargetLabel: Signal<string | null> = computed<string | null>(() => {
    const item: InterventionWorkItemOutput | null = this.nextWorkItem();
    if (!item) return null;
    if (item.targetSummary) return item.targetSummary.label;

    const target: string | null = item.target;
    if (!target) return null;

    return target.startsWith('/api/') ? null : target;
  });

  /**
   * Property submitChecks
   * @readonly
   *
   * @description
   * Submit-readiness conditions shown in the execute rail: every field work
   * item resolved and the current user being the responsible agent. Mirrors the
   * prepare ("Ready to plan") and review ("Ready to publish") rail checklists.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<readonly InterventionReadinessCheck[]>}
   */
  protected readonly submitChecks: Signal<readonly InterventionReadinessCheck[]> = computed<
    readonly InterventionReadinessCheck[]
  >(() => [
    {
      label: $localize`:@@intervention.exec.checkResolved:All field work resolved`,
      done: this.progress() >= 100,
    },
    {
      label: $localize`:@@intervention.exec.checkResponsible:You are the responsible agent`,
      done: this.canSubmit(),
    },
  ]);

  /**
   * Property subStep
   * @readonly
   *
   * @description
   * Active execute sub-step, switching the content column between the field
   * brief (next recommended action) and the full field-work list.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {WritableSignal<'brief' | 'field-work'>}
   */
  protected readonly subStep: WritableSignal<'brief' | 'field-work'> = signal<
    'brief' | 'field-work'
  >('brief');

  /**
   * Property substeps
   * @readonly
   *
   * @description
   * Execute sub-step segments; the brief is marked complete once no work item
   * remains to start, and the field-work step once every item is resolved.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<readonly InterventionSubstep[]>}
   */
  protected readonly substeps: Signal<readonly InterventionSubstep[]> = computed<
    readonly InterventionSubstep[]
  >(() => [
    {
      key: 'brief',
      label: $localize`:@@intervention.exec.stepBrief:Brief`,
      complete: this.nextWorkItem() === null,
    },
    {
      key: 'field-work',
      label: $localize`:@@intervention.exec.stepFieldWork:Field work`,
      complete: this.progress() >= 100,
    },
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
