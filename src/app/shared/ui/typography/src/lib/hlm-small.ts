import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

export const hlmSmall = 'text-sm font-medium leading-none';

@Directive({
  selector: '[hlmSmall]',
})
export class HlmSmall {
  constructor() {
    classes(() => hlmSmall);
  }
}
