import { Injectable, inject } from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { filter } from 'rxjs';
import { MissionOfflineService } from '@features/organization/features/missions/services';

/**
 * Service MissionPwaUpdateService
 * @class MissionPwaUpdateService
 *
 * @description
 * Coordinates service-worker update prompts with mission offline safety.
 *
 * The service listens to Angular service-worker version events and only
 * proposes reload when mission outbox is clean. If unsynchronized field
 * operations exist, the update is deferred and users receive a warning.
 *
 * @since 1.0.0
 */
@Injectable({ providedIn: 'root' })
export class MissionPwaUpdateService {
  private readonly updates: SwUpdate = inject(SwUpdate);
  private readonly confirmation: ConfirmationService = inject(ConfirmationService);
  private readonly messages: MessageService = inject(MessageService);
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);

  /**
   * Method start
   *
   * @description
   * Starts service-worker update monitoring.
   *
   * On `VERSION_READY`, prompts reload only when the mission offline outbox
   * has no pending operations.
   */
  public start(): void {
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe((): void => {
        if (this.offline.hasUnsyncedChanges()) {
          this.messages.add({
            severity: 'warn',
            summary: 'Update waiting',
            detail: 'Synchronize field changes before installing the new version.',
          });
          return;
        }
        this.confirmation.confirm({
          header: 'Application update',
          message: 'A new version is ready. Reload now?',
          accept: (): void => {
            void this.updates.activateUpdate().then(() => location.reload());
          },
        });
      });
  }
}
