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
  form,
  FormField,
  maxLength,
  minLength,
  pattern,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type {
  CreateOrganizationRoleInput,
  OrganizationPermissionOutput,
} from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { OrganizationRoleCreateFormDraft } from './models';

/** A blank draft. */
const EMPTY_VALUES: OrganizationRoleCreateFormDraft = {
  name: '',
  description: '',
  permissions: [],
};

/** The exact slug shape the API accepts for a role name (`UpdateOrganizationRoleInput`/`CreateOrganizationRoleInput` on the backend). */
const NAME_PATTERN: RegExp = /^[a-z0-9_]{3,50}$/;

/** How long a role description may be, mirroring the backend's `Assert\Length` constraint. */
const DESCRIPTION_MAX_LENGTH: number = 500;

/**
 * Interface PermissionDomainGroup
 *
 * @description
 * One section of the permission checklist: every catalog entry that shares
 * a domain segment (`organization.members.*` → `members`), under a
 * localized heading.
 */
interface PermissionDomainGroup {
  readonly domain: string;
  readonly label: string;
  readonly permissions: readonly OrganizationPermissionOutput[];
}

/**
 * Function permissionDomainOf
 *
 * @description
 * The domain segment of a dotted permission name (`organization.members.read`
 * → `members`), or `general` for a name with no domain segment
 * (`organization.read`, `organization.delete`, `organization.*`).
 *
 * @since 1.0.0
 *
 * @param {string} name - The permission's dotted name.
 *
 * @returns {string} The domain segment.
 */
function permissionDomainOf(name: string): string {
  const segments: readonly string[] = name.split('.');

  return segments.length >= 3 ? segments[1] : 'general';
}

/**
 * Function permissionDomainLabelOf
 *
 * @description
 * The localized heading for a permission domain segment. Every domain the
 * current catalog can produce is named explicitly; a domain introduced later
 * falls back to the general heading rather than an unlocalized string.
 *
 * @since 1.0.0
 *
 * @param {string} domain - The domain segment, as produced by {@link permissionDomainOf}.
 *
 * @returns {string} The localized heading.
 */
function permissionDomainLabelOf(domain: string): string {
  switch (domain) {
    case 'dashboard':
      return $localize`:@@org.team.domain.dashboard:Dashboard`;
    case 'events':
      return $localize`:@@org.team.domain.events:Events`;
    case 'members':
      return $localize`:@@org.team.domain.members:Members`;
    case 'roles':
      return $localize`:@@org.team.domain.roles:Roles`;
    case 'facilities':
      return $localize`:@@org.team.domain.facilities:Facilities`;
    case 'equipment':
      return $localize`:@@org.team.domain.equipment:Equipment`;
    case 'inspection':
      return $localize`:@@org.team.domain.inspection:Inspections`;
    case 'interventions':
      return $localize`:@@org.team.domain.interventions:Interventions`;
    case 'messaging':
      return $localize`:@@org.team.domain.messaging:Messaging`;
    case 'assistant':
      return $localize`:@@org.team.domain.assistant:Assistant`;
    case 'settings':
      return $localize`:@@org.team.domain.settings:Settings`;
    default:
      return $localize`:@@org.team.domain.general:General`;
  }
}

/**
 * Component OrganizationRoleCreateForm
 * @class OrganizationRoleCreateForm
 *
 * @description
 * The form that creates a custom organization role: a slug-shaped name, an
 * optional description, and the permission checklist the role starts with.
 * The backend rejects an empty permission list on both create and update
 * (`OrganizationRoleResource` — "At least one permission is required."), so
 * the checklist is validated the same as any other required field rather
 * than presented as optional.
 *
 * Composed from spartan's field primitives like the feature's other create
 * forms; the checklist itself has no bound `[formField]` (Signal Forms has
 * no native array-of-checkboxes control) but is still validated through the
 * schema via `minLength(path.permissions, 1)`, toggled by mutating the model
 * signal directly. It owns its model, its rules and its own validity, and
 * emits {@link submitted} with the API-shaped payload — the page calls the
 * store (`ARCHITECTURE.md` §10.4). Reports its own dirtiness through
 * {@link dirtyChanged} so the hosting sheet can gate dismissal on it.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-create-form',
  imports: [FormField, HlmButton, HlmCheckbox, HlmInput, ...HlmFieldImports, ...HlmTextareaImports],
  templateUrl: './organization-role-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleCreateForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether a creation request is in flight, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the store's create call failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property catalog
   * @readonly
   * @description The organization's assignable permissions, offered as the initial checklist.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationPermissionOutput[]>}
   */
  public readonly catalog: InputSignal<readonly OrganizationPermissionOutput[]> = input<
    readonly OrganizationPermissionOutput[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateOrganizationRoleInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateOrganizationRoleInput> =
    output<CreateOrganizationRoleInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without creating anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   * @description Emits whenever the draft's dirtiness changes — a touched field or a checked permission, since the checklist has no bound `[formField]` to mark the tree dirty for it.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<OrganizationRoleCreateFormDraft> =
    signal<OrganizationRoleCreateFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OrganizationRoleCreateFormDraft>}
   */
  protected readonly createForm: FieldTree<OrganizationRoleCreateFormDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@org.team.form.nameRequired:Role name is required.`,
      });
      pattern(path.name, NAME_PATTERN, {
        message: $localize`:@@org.team.form.namePattern:Use lowercase letters, numbers and underscores only (3-50 characters).`,
      });
      maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
        message: $localize`:@@org.team.form.descriptionTooLong:This description is too long.`,
      });
      minLength(path.permissions, 1, {
        message: $localize`:@@org.team.form.permissionsRequired:Select at least one permission.`,
      });
    },
  );

  /**
   * Property domainGroups
   * @readonly
   * @description The catalog, grouped by domain segment for the checklist.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly PermissionDomainGroup[]>}
   */
  protected readonly domainGroups: Signal<readonly PermissionDomainGroup[]> = computed(
    (): readonly PermissionDomainGroup[] => {
      const groups: Map<string, OrganizationPermissionOutput[]> = new Map();

      for (const permission of this.catalog()) {
        const domain: string = permissionDomainOf(permission.name);
        const bucket: OrganizationPermissionOutput[] | undefined = groups.get(domain);

        if (bucket) bucket.push(permission);
        else groups.set(domain, [permission]);
      }

      return Array.from(groups, ([domain, permissions]) => ({
        domain,
        label: permissionDomainLabelOf(domain),
        permissions,
      }));
    },
  );

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected request, as flat lines shown
   * above the form.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@org.team.form.createFailed:The role could not be created.`];
  });

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether closing right now would lose something: a touched name/description
   * or a checked permission. The permission checklist has no bound
   * `[formField]` — {@link togglePermission} writes the model directly — so
   * {@link createForm}'s own `dirty()` never reflects it and a checked
   * permission is counted alongside it.
   *
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly dirty: Signal<boolean> = computed<boolean>(
    () => this.createForm().dirty() || this.model().permissions.length > 0,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Relays {@link dirty} through {@link dirtyChanged}.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const dirty: boolean = this.dirty();

      untracked((): void => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method isChecked
   * @description Whether the given permission is currently in the draft.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The permission's dotted name.
   * @returns {boolean} `true` when checked.
   */
  protected isChecked(name: string): boolean {
    return this.model().permissions.includes(name);
  }

  /**
   * Method togglePermission
   * @description Adds or removes a permission from the draft's checklist.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The permission's dotted name.
   * @param {boolean} checked - The checkbox's new state.
   * @returns {void}
   */
  protected togglePermission(name: string, checked: boolean): void {
    this.model.update((current) => ({
      ...current,
      permissions: checked
        ? [...current.permissions, name]
        : current.permissions.filter((permission) => permission !== name),
    }));
  }

  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once — including the
   * checklist's own `minLength` rule, which has no bound control to touch it
   * for — then emits when the form is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.createForm().markAsTouched();

    if (this.createForm().invalid()) return;

    const draft: OrganizationRoleCreateFormDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      description: draft.description.trim() === '' ? undefined : draft.description.trim(),
      permissions: draft.permissions,
    });
  }
  //#endregion
}
