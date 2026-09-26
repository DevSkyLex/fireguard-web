import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { PresenceStatus } from '@features/organization/models';
import { HlmAvatarBadge } from '@shared/ui/avatar';

/**
 * Component MemberPresenceIndicator
 * @class MemberPresenceIndicator
 * @description Pure presence decoration for a native avatar, or an inline status with its label.
 * Unknown presence renders nothing. Text and accessible naming never depend on color alone.
 * @since 1.0.0
 */
@Component({
  selector: 'app-member-presence-indicator',
  imports: [HlmAvatarBadge],
  templateUrl: './member-presence-indicator.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberPresenceIndicator {
  /**
   * Property status
   * @readonly
   * @description Confirmed presence; null means unavailable or not loaded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<PresenceStatus | 'invisible' | null>}
   */
  public readonly status: InputSignal<PresenceStatus | 'invisible' | null> = input<
    PresenceStatus | 'invisible' | null
  >(null);

  /**
   * Property showLabel
   * @readonly
   * @description Displays inline text instead of positioning the dot over its parent avatar.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly showLabel: InputSignal<boolean> = input(false);

  /**
   * Property label
   * @readonly
   * @description Localized semantic status available visually or to assistive technology.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly label: Signal<string> = computed(() => {
    const labels: Record<PresenceStatus | 'invisible', string> = {
      invisible: $localize`:@@presence.invisible:Invisible`,
      active: $localize`:@@presence.active:Active`,
      do_not_disturb: $localize`:@@presence.doNotDisturb:Do not disturb`,
      offline: $localize`:@@presence.offline:Offline`,
    };
    const status = this.status();
    return status === null ? '' : labels[status];
  });

  /**
   * Property badgeClass
   * @readonly
   * @description Semantic theme fills, with inline geometry when the label is displayed.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly badgeClass: Signal<string> = computed(() => {
    const classes: Record<PresenceStatus | 'invisible', string> = {
      invisible: 'bg-muted-foreground',
      active: 'bg-success',
      do_not_disturb: 'bg-destructive',
      offline: 'bg-muted-foreground',
    };
    const status = this.status();
    const color = status === null ? '' : classes[status];
    return this.showLabel() ? `static size-2.5 shrink-0 ring-0 ${color}` : color;
  });
}
