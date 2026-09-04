import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
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
  lucideShieldCheck,
  lucideTag,
  lucideUpload,
  lucideWebhook,
  lucideWrench,
} from '@ng-icons/lucide';
import type {
  AuditActionTagDescriptor,
  AuditEventOutput,
} from '@features/organization/features/audit/models';
import { resolveAuditActionTag } from '@features/organization/features/audit/models';
import {
  resolveAuditActorLabel,
  resolveAuditSubjectRoute,
} from '@features/organization/features/audit/utils';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmTableImports } from '@shared/ui/table';

/** How many columns a summary row carries — the expanded metadata row spans this. */
const COLUMN_COUNT: number = 5;

/** One literal Tailwind width per rendered column, for the shared surface's first-load skeleton. */
const SKELETON_COLUMN_WIDTHS: ReadonlyArray<string> = ['size-6', 'w-32', 'w-28', 'w-36', 'w-24'];

/**
 * Component AuditEventTable
 * @class AuditEventTable
 *
 * @description
 * The audit journal grid: `hlmTable` inside a bordered, scrollable shell,
 * one summary row per event — occurred-at timestamp (`recordedAt` carried
 * only as a native `title` tooltip, since the two are usually equal),
 * actor (resolved name or a neutral per-actor-type fallback), the action's
 * module icon and label, and the subject (linked to its record when the
 * subject type has a known route, plain otherwise). Each row's own trailing
 * button expands a second row holding the event's `metadata` as a compact
 * key/value list, collapsed by default. Events without metadata render no
 * disclosure control, and technical identifiers are humanized before they
 * reach the reader.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service; the page owns loading, filtering and paging. Which rows are
 * expanded is local, ephemeral UI state, not fetched data, so it stays in
 * this component rather than round-tripping through the page.
 *
 * @version 1.1.0
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
      lucideShieldCheck,
      lucideTag,
      lucideUpload,
      lucideWebhook,
      lucideWrench,
    }),
  ],
  templateUrl: './audit-event-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
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
   * @description The event's `metadata` object, flattened to renderable key/value pairs.
   * @access protected
   * @since 1.0.0
   * @param {AuditEventOutput} item - The rendered event.
   * @returns {ReadonlyArray<[string, unknown]>} The metadata entries, in insertion order.
   */
  protected metadataEntriesOf(item: AuditEventOutput): ReadonlyArray<[string, unknown]> {
    return Object.entries(item.metadata);
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
    return this.humanizeIdentifier(key);
  }

  /**
   * Method metadataValueOf
   * @method metadataValueOf
   *
   * @description
   * Formats the backend's allowlisted scalar metadata without exposing
   * JavaScript placeholders such as `null` or `[object Object]`.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {unknown} value - The metadata value supplied by the API.
   *
   * @returns {string} A stable reader-facing representation.
   */
  protected metadataValueOf(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') {
      return value ? $localize`:@@common.yes:Yes` : $localize`:@@common.no:No`;
    }
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value))
      return value.map((entry: unknown): string => String(entry)).join(', ');

    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
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
