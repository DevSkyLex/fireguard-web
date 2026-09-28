import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  LOCALE_ID,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBox,
  lucideBuilding,
  lucideBuilding2,
  lucideBot,
  lucideChevronDown,
  lucideClipboardList,
  lucideCompass,
  lucideGavel,
  lucideHash,
  lucideServer,
  lucideShieldCheck,
  lucideTag,
  lucideUpload,
  lucideUserX,
  lucideWebhook,
  lucideWrench,
} from '@ng-icons/lucide';
import type {
  AuditActionTagDescriptor,
  AuditActorType,
  AuditEventOutput,
} from '@features/organization/features/audit/models';
import { resolveAuditActionTag } from '@features/organization/features/audit/models';
import {
  resolveAuditActorLabel,
  resolveAuditSubjectRoute,
} from '@features/organization/features/audit/utils';
import { getOrganizationInitials } from '@features/organization/utils';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmTableImports } from '@shared/ui/table';

/** Muted glyph shown instead of an avatar for a non-`'user'` actor type. */
const AUDIT_ACTOR_ICON: Readonly<Record<Exclude<AuditActorType, 'user'>, string>> = {
  client: 'lucideBot',
  system: 'lucideServer',
  anonymous: 'lucideUserX',
};

/** How many columns a summary row carries — the expanded metadata row spans this. */
const COLUMN_COUNT: number = 5;

/** One literal Tailwind width per rendered column, for the shared surface's first-load skeleton. */
const SKELETON_COLUMN_WIDTHS: ReadonlyArray<string> = ['size-6', 'w-32', 'w-28', 'w-36', 'w-24'];

/** Metadata keys carrying a raw UUID with no reader-facing destination — dropped rather than shown raw, per `FEATURE.md`'s UUID rule. */
const OPAQUE_ID_METADATA_KEYS: ReadonlySet<string> = new Set([
  'attachment_id',
  'previous_attachment_id',
]);

/**
 * Component AuditEventTable
 * @class AuditEventTable
 *
 * @description
 * The audit journal grid: `hlmTable` inside a bordered, scrollable shell (a
 * flat `hlmItemGroup` with `hlm-item-separator` on the compact card layout),
 * a day separator (`hlmMarker`/a full-width row, in the organization's
 * timezone) before the first event of each calendar day, then one summary
 * row per event — occurred-at timestamp (with a visible muted "Recorded …"
 * line when `recordedAt` differs), actor (an initials avatar for a `'user'`
 * actor, a muted type glyph for `client`/`system`/`anonymous`), the
 * action's module icon and label, and the subject (linked to its record
 * when the subject type has a known route, plain otherwise). Each row's own
 * trailing button expands a second row holding the event's `metadata` as a
 * compact key/value list, collapsed by default. Events without metadata
 * render no disclosure control; opaque id fields with no destination are
 * dropped, a linked id renders as a named link, and every other value is
 * humanized — never raw JSON.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service; the page owns loading, filtering and paging. Which rows are
 * expanded is local, ephemeral UI state, not fetched data, so it stays in
 * this component rather than round-tripping through the page.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-event-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    CollectionSurface,
    RouterLink,
    NgIcon,
    HlmBadge,
    HlmButton,
    ...HlmAvatarImports,
    ...HlmItemImports,
    ...HlmMarkerImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideBox,
      lucideBuilding,
      lucideBuilding2,
      lucideBot,
      lucideChevronDown,
      lucideClipboardList,
      lucideCompass,
      lucideGavel,
      lucideHash,
      lucideServer,
      lucideShieldCheck,
      lucideTag,
      lucideUpload,
      lucideUserX,
      lucideWebhook,
      lucideWrench,
    }),
  ],
  templateUrl: './audit-event-table.component.html',
  host: {
    class:
      'block min-h-0 w-full flex-1 mobile-ui:min-h-fit mobile-ui:flex-none mobile-ui:md:min-h-0 mobile-ui:md:flex-1',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditEventTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly AuditEventOutput[]>}
   */
  public readonly items: InputSignal<readonly AuditEventOutput[]> =
    input.required<readonly AuditEventOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property organizationId
   * @readonly
   * @description The workspace the subject links are built against.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Properties
  /** How many cells a summary row has, so the expanded metadata row can span the rest of it. */
  protected readonly columnCount: number = COLUMN_COUNT;

  /** One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. */
  protected readonly skeletonColumnWidths: ReadonlyArray<string> = SKELETON_COLUMN_WIDTHS;

  /** Ids of the rows currently showing their metadata. */
  private readonly expandedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set(),
  );

  /** The application's active locale, for {@link dayHeadingOf}. */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method actionTagOf
   * @description Resolves an event's action to its presentation descriptor.
   * @access protected
   * @since 1.0.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {AuditActionTagDescriptor} The resolved label, module and icon.
   */
  protected actionTagOf(item: AuditEventOutput): AuditActionTagDescriptor {
    return resolveAuditActionTag(item.action);
  }

  /**
   * Method actorLabelOf
   * @description Resolves an event's actor to its rendered label.
   * @access protected
   * @since 1.0.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {string} The resolved display name or its neutral fallback.
   */
  protected actorLabelOf(item: AuditEventOutput): string {
    return resolveAuditActorLabel(item.actorType, item.actorDisplayName);
  }

  /**
   * Method actorIconOf
   * @description The muted glyph standing in for a non-`'user'` actor's avatar, or `null` when a `'user'` actor should render an initials avatar instead.
   * @access protected
   * @since 1.3.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {string | null} The icon name, or `null`.
   */
  protected actorIconOf(item: AuditEventOutput): string | null {
    return item.actorType === 'user' ? null : AUDIT_ACTOR_ICON[item.actorType];
  }

  /**
   * Method actorInitialsOf
   * @description The `'user'` actor's avatar-fallback initials, derived from their resolved label.
   * @access protected
   * @since 1.3.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {string} A 1–2 letter uppercase initials string.
   */
  protected actorInitialsOf(item: AuditEventOutput): string {
    return getOrganizationInitials(this.actorLabelOf(item));
  }

  /**
   * Method subjectRouteOf
   * @description The subject's own record or list route, or `null` when the subject type has none.
   * @access protected
   * @since 1.0.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {readonly string[] | null} Route commands for `[routerLink]`, or `null`.
   */
  protected subjectRouteOf(item: AuditEventOutput): readonly string[] | null {
    return resolveAuditSubjectRoute(this.organizationId(), item.subjectType, item.subjectId);
  }

  /**
   * Method subjectLabelOf
   * @method subjectLabelOf
   *
   * @description
   * Converts an API subject identifier such as `calendar_feed_token` into
   * a readable label while preserving a neutral dash for subject-less
   * journal entries.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {AuditEventOutput} item - The rendered event.
   *
   * @returns {string} The readable subject label or an em dash.
   */
  protected subjectLabelOf(item: AuditEventOutput): string {
    return item.subjectType ? this.humanizeIdentifier(item.subjectType) : '—';
  }

  /**
   * Method metadataEntriesOf
   *
   * @description
   * The event's `metadata` object, flattened to renderable key/value pairs.
   * Opaque id fields with no reader-facing destination
   * ({@link OPAQUE_ID_METADATA_KEYS}) are dropped rather than shown as a raw
   * UUID; a linked id field (`intervention_id`) stays, rendered as a link by
   * {@link metadataLinkRouteOf} rather than its raw value.
   *
   * @access protected
   * @since 1.0.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {ReadonlyArray<[string, unknown]>} The metadata entries, in insertion order.
   */
  protected metadataEntriesOf(item: AuditEventOutput): ReadonlyArray<[string, unknown]> {
    return Object.entries(item.metadata).filter(([key]) => !OPAQUE_ID_METADATA_KEYS.has(key));
  }

  /**
   * Method metadataLinkRouteOf
   * @description The gated record's own detail route for a linked id metadata field, or `null` when the field is not one.
   * @access protected
   * @since 1.3.0
   * @param {string} key - The metadata entry's key.
   * @param {unknown} value - The metadata entry's value.
   * @returns {readonly string[] | null} Route commands for `[routerLink]`, or `null` to render the value plainly.
   */
  protected metadataLinkRouteOf(key: string, value: unknown): readonly string[] | null {
    if (key !== 'intervention_id' || typeof value !== 'string' || value.length === 0) return null;

    return ['/organizations', this.organizationId(), 'interventions', value];
  }

  /**
   * Method hasMetadata
   * @method hasMetadata
   *
   * @description
   * Reports whether expanding an event would reveal useful content. This
   * keeps empty audit records free from a misleading disclosure action.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {AuditEventOutput} item - The rendered event.
   *
   * @returns {boolean} `true` when at least one metadata field exists.
   */
  protected hasMetadata(item: AuditEventOutput): boolean {
    return this.metadataEntriesOf(item).length > 0;
  }

  /**
   * Method metadataLabelOf
   * @method metadataLabelOf
   *
   * @description Converts a backend metadata key into a readable field label.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} key - The backend metadata key.
   *
   * @returns {string} The humanized field label.
   */
  protected metadataLabelOf(key: string): string {
    switch (key) {
      case 'operation':
        return $localize`:@@audit.metadata.operation:Change`;
      case 'attachment_id':
        return $localize`:@@audit.metadata.attachment:Floor plan`;
      case 'previous_attachment_id':
        return $localize`:@@audit.metadata.previousAttachment:Previous floor plan`;
      case 'revision':
        return $localize`:@@audit.metadata.revision:Revision`;
      case 'intervention_id':
        return $localize`:@@audit.metadata.intervention:Intervention`;
      default:
        return this.humanizeIdentifier(key);
    }
  }

  /**
   * Method metadataValueOf
   * @method metadataValueOf
   *
   * @description
   * Formats the backend's allowlisted scalar metadata without exposing
   * JavaScript placeholders such as `null` or `[object Object]`, and never
   * a raw JSON dump — an unallowlisted shape renders a neutral fallback
   * instead.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {unknown} value - The metadata value supplied by the API.
   * @param {string} key - The metadata key controlling known enum labels.
   *
   * @returns {string} A stable reader-facing representation.
   */
  protected metadataValueOf(value: unknown, key: string = ''): string {
    if (key === 'operation') {
      switch (value) {
        case 'placed':
          return $localize`:@@audit.metadata.placed:Placed on plan`;
        case 'moved':
          return $localize`:@@audit.metadata.moved:Moved on plan`;
        case 'cleared':
          return $localize`:@@audit.metadata.cleared:Removed from plan`;
      }
    }
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') {
      return value ? $localize`:@@common.yes:Yes` : $localize`:@@common.no:No`;
    }
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(String).join(', ');

    return $localize`:@@audit.metadata.unsupportedValue:Unsupported value`;
  }

  /**
   * Method isExpanded
   * @description Whether a row's metadata is currently shown.
   * @access protected
   * @since 1.0.0
   * @param {string} id - The rendered event's id.
   * @returns {boolean}
   */
  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  /**
   * Method toggleExpanded
   * @description Shows or hides one row's metadata.
   * @access protected
   * @since 1.0.0
   * @param {string} id - The rendered event's id.
   * @returns {void}
   */
  protected toggleExpanded(item: AuditEventOutput): void {
    if (!this.hasMetadata(item)) return;

    const next: Set<string> = new Set(this.expandedIds());
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
    }
    this.expandedIds.set(next);
  }

  /**
   * Method expandAriaLabelOf
   *
   * @description
   * The row's expand/collapse button's accessible name, folding in the
   * action label and the occurred-at timestamp so two rows never announce
   * as the identical "Show details" — mirrors `ImportJobTable.viewReportAriaLabelOf`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {AuditEventOutput} item - The rendered event.
   *
   * @returns {string} The accessible name.
   */
  protected expandAriaLabelOf(item: AuditEventOutput): string {
    const label: string = this.actionTagOf(item).label;
    const occurredAt: string = item.occurredAt;

    return this.isExpanded(item.id)
      ? $localize`:@@audit.table.collapseNamed:Hide details for ${label}:label: at ${occurredAt}:occurredAt:`
      : $localize`:@@audit.table.expandNamed:Show details for ${label}:label: at ${occurredAt}:occurredAt:`;
  }

  /**
   * Method isDayBoundary
   * @description Whether a row opens a new calendar day in the organization's timezone, so a day separator should render before it.
   * @access protected
   * @since 1.3.0
   * @param {AuditEventOutput} item - The row being rendered.
   * @param {AuditEventOutput | undefined} previous - The preceding row, or `undefined` for the first row.
   * @returns {boolean} `true` when a separator belongs before `item`.
   */
  protected isDayBoundary(item: AuditEventOutput, previous: AuditEventOutput | undefined): boolean {
    return previous === undefined || this.dayKeyOf(item) !== this.dayKeyOf(previous);
  }

  /**
   * Method dayHeadingOf
   * @description The localized day heading ("Monday, September 27, 2026") for a row's separator, in the organization's timezone.
   * @access protected
   * @since 1.3.0
   * @param {AuditEventOutput} item - The row opening the day.
   * @returns {string} The formatted day heading.
   */
  protected dayHeadingOf(item: AuditEventOutput): string {
    const date: Date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime())) return item.occurredAt;

    return this.dayFormatter().format(date);
  }

  /**
   * Method dayKeyOf
   * @description A sortable `'YYYY-MM-DD'` calendar-day key for `item`, resolved in the organization's timezone — falls back to UTC for an unresolvable zone.
   * @access private
   * @since 1.3.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {string} The calendar-day key, or the raw timestamp when it does not parse.
   */
  private dayKeyOf(item: AuditEventOutput): string {
    const date: Date = new Date(item.occurredAt);
    if (Number.isNaN(date.getTime())) return item.occurredAt;

    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: this.regionalFormatting().timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    }
  }

  /**
   * Method dayFormatter
   * @description The localized, organization-timezone day-heading formatter, falling back to UTC for an unresolvable zone.
   * @access private
   * @since 1.3.0
   * @returns {Intl.DateTimeFormat} The formatter for {@link dayHeadingOf}.
   */
  private dayFormatter(): Intl.DateTimeFormat {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    try {
      return new Intl.DateTimeFormat(this.locale, {
        ...options,
        timeZone: this.regionalFormatting().timezone,
      });
    } catch {
      return new Intl.DateTimeFormat(this.locale, { ...options, timeZone: 'UTC' });
    }
  }

  /**
   * Method humanizeIdentifier
   * @method humanizeIdentifier
   *
   * @description
   * Turns snake-case, kebab-case and dotted transport identifiers into a
   * sentence label while keeping the conversion local to audit rendering.
   *
   * @access private
   * @since 1.2.0
   *
   * @param {string} value - The transport identifier to transform.
   *
   * @returns {string} A sentence-cased label.
   */
  private humanizeIdentifier(value: string): string {
    const words: string = value
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return words.length === 0 ? '—' : words.charAt(0).toUpperCase() + words.slice(1);
  }
  //#endregion
}
