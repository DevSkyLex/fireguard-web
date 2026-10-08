import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  applyEach,
  disabled,
  email,
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  ChangeSupplierInput,
  SupplierOutput,
} from '@features/organization/features/procurement/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface ContactDraft
 * @interface ContactDraft
 *
 * @description
 * Editable contact fields remain strings until a validated submission.
 *
 * @since unreleased
 */
interface ContactDraft {
  /**
   * Property name
   *
   * @description
   * Display name; whitespace-only input is rejected before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  name: string;

  /**
   * Property email
   *
   * @description
   * Optional email address validated before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  email: string;

  /**
   * Property phone
   *
   * @description
   * Optional telephone number; no assumed country format.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  phone: string;

  /**
   * Property role
   *
   * @description
   * Optional responsibility of the internal supplier contact.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  role: string;
}
/**
 * Interface SupplierDraft
 * @interface SupplierDraft
 *
 * @description
 * Editable supplier fields and contacts owned exclusively by the form.
 *
 * @since unreleased
 */
interface SupplierDraft {
  /**
   * Property name
   *
   * @description
   * Display name; whitespace-only input is rejected before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  name: string;

  /**
   * Property code
   *
   * @description
   * Optional internal supplier reference.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  code: string;

  /**
   * Property email
   *
   * @description
   * Optional email address validated before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  email: string;

  /**
   * Property phone
   *
   * @description
   * Optional telephone number; no assumed country format.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  phone: string;

  /**
   * Property contacts
   *
   * @description
   * Internal contacts retained with the supplier, without external account access.
   *
   * @access public
   * @since unreleased
   *
   * @type {ContactDraft[]}
   */
  contacts: ContactDraft[];
}
/**
 * Function emptyDraft
 *
 * @description
 * Creates an empty internal supplier draft.
 *
 * @access public
 * @since unreleased
 *
 * @returns {SupplierDraft} Result for the owning supplier workflow.
 */
function emptyDraft(): SupplierDraft {
  return { name: '', code: '', email: '', phone: '', contacts: [] };
}
/**
 * Function optional
 *
 * @description
 * Maps optional blank fields to explicit clears accepted by merge patch.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - Value supplied by the owning supplier workflow.
 *
 * @returns {string | null} Result for the owning supplier workflow.
 */
function optional(value: string): string | null {
  return value.trim() || null;
}

/**
 * Class SupplierForm
 * @class SupplierForm
 *
 * @description
 * Native supplier form preserving failed drafts and emitting only validated transport input.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-supplier-form',
  templateUrl: './supplier-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, HlmButton, HlmInput, HlmSpinner, ...HlmFieldImports, ...HlmAlertImports],
})
export class SupplierForm {
  //#region Properties
  /**
   * Property supplier
   * @readonly
   *
   * @description
   * Existing supplier or an empty creation draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<SupplierOutput | null>}
   */
  public readonly supplier: InputSignal<SupplierOutput | null> = input<SupplierOutput | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Locks all editors during an accepted write.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized server rejection, displayed without discarding input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated supplier payload.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ChangeSupplierInput>}
   */
  public readonly submitted: OutputEmitterRef<ChangeSupplierInput> = output<ChangeSupplierInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Requests dismissal; the hosting sheet owns confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Actual Signal Forms dirty state used by the host.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Supplier and contact drafts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<SupplierDraft>}
   */
  protected readonly draft: WritableSignal<SupplierDraft> = signal(emptyDraft());

  /**
   * Property supplierForm
   * @readonly
   *
   * @description
   * Native field validation and submission state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<SupplierDraft>}
   */
  protected readonly supplierForm: FieldTree<SupplierDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() });
    validate(path.contacts, ({ value }) =>
      value().length <= 50
        ? null
        : {
            kind: 'maxLength',
            message: $localize`:@@procurement.supplier.contactsLimit:Keep at most 50 contacts per supplier.`,
          },
    );
    required(path.name, {
      message: $localize`:@@procurement.supplier.nameRequired:Enter the supplier name.`,
    });
    validate(path.name, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@procurement.supplier.nameRequired:Enter the supplier name.`,
          },
    );
    maxLength(path.name, 160, {
      message: $localize`:@@procurement.supplier.max160:Use at most 160 characters.`,
    });
    maxLength(path.code, 80, {
      message: $localize`:@@procurement.supplier.max80:Use at most 80 characters.`,
    });
    maxLength(path.email, 254, {
      message: $localize`:@@procurement.supplier.emailInvalid:Enter a valid email address.`,
    });
    email(path.email, {
      message: $localize`:@@procurement.supplier.emailInvalid:Enter a valid email address.`,
    });
    maxLength(path.phone, 40, {
      message: $localize`:@@procurement.supplier.max40:Use at most 40 characters.`,
    });
    applyEach(path.contacts, (contact) => {
      required(contact.name, {
        message: $localize`:@@procurement.supplier.contactRequired:Enter the contact name.`,
      });
      validate(contact.name, ({ value }) =>
        value().trim()
          ? null
          : {
              kind: 'required',
              message: $localize`:@@procurement.supplier.contactRequired:Enter the contact name.`,
            },
      );
      maxLength(contact.name, 160, {
        message: $localize`:@@procurement.supplier.max160:Use at most 160 characters.`,
      });
      maxLength(contact.email, 254, {
        message: $localize`:@@procurement.supplier.emailInvalid:Enter a valid email address.`,
      });
      email(contact.email, {
        message: $localize`:@@procurement.supplier.emailInvalid:Enter a valid email address.`,
      });
      maxLength(contact.phone, 40, {
        message: $localize`:@@procurement.supplier.max40:Use at most 40 characters.`,
      });
      maxLength(contact.role, 80, {
        message: $localize`:@@procurement.supplier.max80:Use at most 80 characters.`,
      });
    });
  });

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Creation and edition share one truthful submit caption.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly submitLabel: Signal<string> = computed(() =>
    this.supplier()
      ? $localize`:@@procurement.supplier.save:Save supplier`
      : $localize`:@@procurement.supplier.create:Create supplier`,
  );

  /**
   * Property seededIdentity
   *
   * @description
   * Identity already seeded; revision refreshes must not replace the entered draft.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  private seededIdentity: string | null | undefined = undefined;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds only when record identity changes; server rejection never resets the draft.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const supplier = this.supplier();
      const identity = supplier?.id ?? null;
      if (this.seededIdentity === identity) return;
      this.seededIdentity = identity;
      untracked(() => {
        this.supplierForm().reset(
          supplier
            ? {
                name: supplier.name,
                code: supplier.code ?? '',
                email: supplier.email ?? '',
                phone: supplier.phone ?? '',
                contacts: supplier.contacts.map((contact) => ({
                  name: contact.name,
                  email: contact.email ?? '',
                  phone: contact.phone ?? '',
                  role: contact.role ?? '',
                })),
              }
            : emptyDraft(),
        );
      });
    });
    effect(() => {
      const dirty = this.supplierForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method addContact
   * @method addContact
   *
   * @description
   * Adds a contact without changing the server directory.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected addContact(): void {
    if (!this.pending() && this.draft().contacts.length < 50) {
      this.draft.update((draft) => ({
        ...draft,
        contacts: [...draft.contacts, { name: '', email: '', phone: '', role: '' }],
      }));
      this.supplierForm().markAsDirty();
    }
  }

  /**
   * Method removeContact
   * @method removeContact
   *
   * @description
   * Removes one local contact while keeping the remaining draft.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} index - Value supplied by the owning supplier workflow.
   *
   * @returns {void} No return value.
   */
  protected removeContact(index: number): void {
    if (!this.pending()) {
      this.draft.update((draft) => ({
        ...draft,
        contacts: draft.contacts.filter((_, position) => position !== index),
      }));
      this.supplierForm().markAsDirty();
    }
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Exposes errors before emitting normalized supplier and contact data.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Value supplied by the owning supplier workflow.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.supplierForm().markAsTouched();
    if (this.pending() || this.supplierForm().invalid()) return;
    const draft = this.draft();
    this.submitted.emit({
      name: draft.name.trim(),
      code: optional(draft.code),
      email: optional(draft.email),
      phone: optional(draft.phone),
      contacts: draft.contacts.map((contact) => ({
        name: contact.name.trim(),
        email: optional(contact.email),
        phone: optional(contact.phone),
        role: optional(contact.role),
      })),
    });
  }
  //#endregion
}
