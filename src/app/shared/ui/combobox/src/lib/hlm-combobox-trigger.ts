import { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import {
  BrnComboboxAnchor,
  BrnComboboxPopoverTrigger,
  BrnComboboxTrigger,
} from '@spartan-ng/brain/combobox';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import type { ClassValue } from 'clsx';
import { ButtonVariants, HlmButton } from '@shared/ui/button';
import { hlm } from '@shared/ui/utils';

@Component({
  selector: 'hlm-combobox-trigger',
  imports: [
    NgIcon,
    HlmButton,
    BrnComboboxAnchor,
    BrnComboboxTrigger,
    BrnComboboxPopoverTrigger,
    BrnFieldControlDescribedBy,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      brnComboboxTrigger
      brnComboboxAnchor
      brnComboboxPopoverTrigger
      brnFieldControlDescribedBy
      hlmBtn
      data-slot="combobox-trigger"
      [id]="buttonId()"
      [class]="_computedClass()"
      [variant]="variant()"
      [forceInvalid]="forceInvalid()"
    >
      <ng-content />
      <ng-icon name="lucideChevronDown" class="text-[length:--spacing(4)] text-muted-foreground" />
    </button>
  `,
})
export class HlmComboboxTrigger {
  private static _id = 0;

  public readonly userClass = input<ClassValue>('', {
    alias: 'class',
  });
  protected readonly _computedClass = computed(() =>
    hlm('data-placeholder:text-muted-foreground', this.userClass()),
  );

  public readonly buttonId = input<string>(`hlm-combobox-trigger-${HlmComboboxTrigger._id++}`);

  public readonly variant = input<ButtonVariants['variant']>('outline');

  public readonly forceInvalid = input<boolean, BooleanInput>(false, {
    transform: booleanAttribute,
  });
}
