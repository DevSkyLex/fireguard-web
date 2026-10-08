import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  ServiceRequestOutput,
  ServiceRequestPriority,
  CreateServiceRequestInput,
} from '@features/organization/features/service-requests/models';
import {
  ServiceRequestEquipmentPicker,
  ServiceRequestSitePicker,
} from '@features/organization/features/service-requests/ui/components';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
/**
 * Interface ServiceRequestDraft
 * @interface
 *
 * @description
 * Entered description and target fields owned by Signal Forms.
 *
 * @since unreleased
 */
interface ServiceRequestDraft {
  /**
   * Property title
   *
   * @description
   * Declared request title or localized overlay title.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  title: string;
  /**
   * Property description
   *
   * @description
   * Entered maintenance need retained while a command is rejected.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  description: string;
  /**
   * Property priority
   *
   * @description
   * Declared scheduling priority using the server vocabulary.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestPriority}
   */
  priority: ServiceRequestPriority;
  /**
   * Property equipmentId
   *
   * @description
   * Published equipment target or its explicit search scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  equipmentId: string;
  /**
   * Property siteId
   *
   * @description
   * Root-site target or scope; qualification choices stay inside this site.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  siteId: string;
}
/**
 * Class ServiceRequestForm
 * @class ServiceRequestForm
 *
 * @description
 * Validated request description and optional site-only target; a revision refresh never overwrites
 * an entered draft.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-form',
  templateUrl: './service-request-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    HlmTextarea,
    HlmSpinner,
    ServiceRequestEquipmentPicker,
    ServiceRequestSitePicker,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmToggleGroupImports,
  ],
})
export class ServiceRequestForm {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property request
   * @readonly
   *
   * @description
   * Immutable request revision supplied by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestOutput | null>}
   */
  public readonly request = input<ServiceRequestOutput | null>(null);
  /**
   * Property initialEquipmentId
   * @readonly
   *
   * @description
   * Optional equipment prefill supplied by a dossier entry link.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly initialEquipmentId = input('');
  /**
   * Property initialSiteId
   * @readonly
   *
   * @description
   * Optional root-site prefill supplied by a dossier entry link.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly initialSiteId = input('');
  /**
   * Property originInspectionId
   * @readonly
   *
   * @description
   * Optional source inspection preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly originInspectionId = input('');
  /**
   * Property originNonConformityId
   * @readonly
   *
   * @description
   * Optional source anomaly preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly originNonConformityId = input('');
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Disables editing while the owning mutation is accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized command error displayed without resetting the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error = input<StoreError | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated intent emitted to the owning page; the form never writes directly.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<CreateServiceRequestInput>}
   */
  public readonly submitted = output<CreateServiceRequestInput>();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Dismissal intent routed through the owning overlay policy.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled = output<void>();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Real Signal Forms dirtiness exposed to the owning overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable Signal Forms model retained after server rejection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestDraft>}
   */
  protected readonly draft = signal<ServiceRequestDraft>({
    title: '',
    description: '',
    priority: 'normal',
    equipmentId: '',
    siteId: '',
  });
  /**
   * Property requestForm
   * @readonly
   *
   * @description
   * Description and cross-field target validation with server length bounds.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ServiceRequestDraft>}
   */
  protected readonly requestForm: FieldTree<ServiceRequestDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() });
    required(path.title, {
      message: $localize`:@@serviceRequest.form.titleRequired:Describe the request with a title.`,
    });
    required(path.description, {
      message: $localize`:@@serviceRequest.form.descriptionRequired:Describe the maintenance need.`,
    });
    maxLength(path.title, 160, {
      message: $localize`:@@serviceRequest.form.max160:Use at most 160 characters.`,
    });
    maxLength(path.description, 10000, {
      message: $localize`:@@serviceRequest.form.max10000:Use at most 10000 characters.`,
    });
    validate(path.title, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@serviceRequest.form.titleRequired:Describe the request with a title.`,
          },
    );
    validate(path.description, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@serviceRequest.form.descriptionRequired:Describe the maintenance need.`,
          },
    );
    validate(path.equipmentId, ({ value, valueOf }) =>
      this.request() || value().trim() || valueOf(path.siteId).trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@serviceRequest.form.targetRequired:Choose equipment or a site.`,
          },
    );
  });
  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Truthful action label derived from the prepared request or work selection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly submitLabel = computed(() =>
    this.request()
      ? $localize`:@@serviceRequest.form.save:Save request`
      : $localize`:@@serviceRequest.form.create:Submit maintenance request`,
  );
  /**
   * Property seededIdentity
   *
   * @description
   * Record/action identity already seeded; a revision refresh must retain the draft.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | undefined}
   */
  private seededIdentity: string | undefined;
  /**
   * Property previousSiteId
   *
   * @description
   * Previously seeded or selected site distinguishes hydration from a user target change.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private previousSiteId = '';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds a new record identity and reports real form dirtiness; revision refreshes retain entered
   * fields.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const request = this.request(),
        org = this.organizationId(),
        equipmentId = this.initialEquipmentId(),
        siteId = this.initialSiteId();
      const identity = org + '/' + (request?.id ?? 'new');
      if (identity === this.seededIdentity) return;
      this.seededIdentity = identity;
      this.previousSiteId = request?.siteId ?? siteId;
      untracked(() =>
        this.requestForm().reset(
          request
            ? {
                title: request.title,
                description: request.description,
                priority: request.priority,
                equipmentId: request.equipmentId ?? '',
                siteId: request.siteId ?? '',
              }
            : { title: '', description: '', priority: 'normal', equipmentId, siteId },
        ),
      );
    });
    effect(() => {
      const dirty = this.requestForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method priorityChanged
   *
   * @description
   * Accepts only canonical priority choices without clearing other entered fields.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native choice value validated against the current options.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected priorityChanged(value: unknown): void {
    if (this.pending()) return;
    if (value === 'low' || value === 'normal' || value === 'high' || value === 'urgent') {
      this.requestForm.priority().value.set(value);
      this.requestForm.priority().markAsDirty();
    }
  }
  /**
   * Method siteChanged
   *
   * @description
   * Clears an equipment choice after a real site change while preserving initial hydration.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} siteId - Newly emitted root-site identity.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected siteChanged(siteId: string): void {
    if (this.previousSiteId === siteId) return;
    this.previousSiteId = siteId;
    this.requestForm.equipmentId().value.set('');
  }
  /**
   * Method submit
   *
   * @description
   * Emits normalized validated intent only after exposing errors and checking pending work.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native submit or input event.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.requestForm().markAsTouched();
    if (this.pending() || this.requestForm().invalid()) return;
    const draft = this.draft();
    const description = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
    };
    this.submitted.emit(
      this.request()
        ? description
        : {
            ...description,
            equipmentId: draft.equipmentId || null,
            siteId: draft.siteId || null,
            originInspectionId: this.originInspectionId() || null,
            originNonConformityId: this.originNonConformityId() || null,
          },
    );
  }
  //#endregion
}
