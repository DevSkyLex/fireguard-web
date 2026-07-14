import { DatePipe, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import type { AuditEventOutput } from '@features/organization/models';

/**
 * Component AuditEventDetailDrawer
 * @class AuditEventDetailDrawer
 *
 * @description
 * Presentational right-side drawer showing the full field set of a single
 * audit event (actor, subject, client/tenant context, hash chain, and raw
 * metadata) beyond what fits in the audit event table row. Owns only the
 * drawer shell — visibility, sizing and dismiss behaviour; it neither injects
 * the owning `AuditStore` nor calls `AuditEventService` directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-audit-event-detail-drawer',
  imports: [DatePipe, DrawerModule, JsonPipe],
  templateUrl: './audit-event-detail-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditEventDetailDrawer {
  //#region Inputs
  /** Whether the drawer is currently open. */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /** Audit event whose full field set is displayed, or `null` when none is selected. */
  public readonly auditEvent: InputSignal<AuditEventOutput | null> = input<AuditEventOutput | null>(
    null,
  );
  //#endregion

  //#region Outputs
  /** Emits the new visibility state when the drawer is opened or dismissed. */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /** Drawer pass-through: full width on mobile, comfortable reading width above. */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full sm:!w-[28rem]' },
  };
  //#endregion

  //#region Methods
  /** Whether the audit event's `metadata` record carries at least one entry. */
  protected hasMetadataEntries(metadata: Record<string, unknown> | undefined): boolean {
    return !!metadata && Object.keys(metadata).length > 0;
  }
  //#endregion
}
