import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import type { MemberSelectOption } from '@features/organization/features/interventions/models';

/**
 * Compact identity row used inside intervention member selectors.
 */
@Component({
  selector: 'app-intervention-member-option',
  imports: [AvatarModule],
  templateUrl: './intervention-member-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionMemberOption {
  public readonly option: InputSignal<MemberSelectOption> = input.required<MemberSelectOption>();
  public readonly compact: InputSignal<boolean> = input(false);
}
