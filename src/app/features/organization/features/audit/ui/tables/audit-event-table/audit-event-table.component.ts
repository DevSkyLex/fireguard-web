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
  lucideFileText,
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
import { EmptyState } from '@shared/empty-state';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/** How many columns a summary row carries — the empty and skeleton rows span this. */
const COLUMN_COUNT: number = 5;

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
 * key/value list, collapsed by default.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service; the page owns loading, filtering and paging. Which rows are
 * expanded is local, ephemeral UI state, not fetched data, so it stays in
 * this component rather than round-tripping through the page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-event-table',
  imports: [
    EmptyState,
    OrgDatePipe,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmSkeleton,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideFileText,
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
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

  /** How many cells a summary row has, so the empty state can span the full width. */
  protected readonly columnCount: number = COLUMN_COUNT;

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
  protected toggleExpanded(id: string): void {
    const next: Set<string> = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
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
  //#endregion
}
