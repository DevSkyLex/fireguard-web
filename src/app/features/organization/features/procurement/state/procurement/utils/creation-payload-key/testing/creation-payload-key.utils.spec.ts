import type { CreatePurchaseOrderInput } from '@features/organization/features/procurement/models';
import { creationPayloadKey } from '../creation-payload-key.utils';

describe('creationPayloadKey', () => {
  it('preserves code-unit sorting and array order while excluding only the operation UUID', () => {
    const input: CreatePurchaseOrderInput = {
      supplierId: 'supplier',
      name: 'Reserve',
      lines: [
        {
          quantity: '2.000000',
          kind: 'equipment_to_individualize',
          identityTemplate: { é: 'accent', a: 'lowercase', Z: 'uppercase' },
        },
        { quantity: '0.500000', kind: 'part', partId: 'part' },
      ],
      clientOperationId: 'c4f0ba7a-c177-46be-b138-c0bbba1ca6cc',
    };
    expect(creationPayloadKey(input)).toBe(
      '{"lines":[{"identityTemplate":{"Z":"uppercase","a":"lowercase","é":"accent"},"kind":"equipment_to_individualize","quantity":"2.000000"},{"kind":"part","partId":"part","quantity":"0.500000"}],"name":"Reserve","supplierId":"supplier"}',
    );
    expect(input.clientOperationId).toBe('c4f0ba7a-c177-46be-b138-c0bbba1ca6cc');
  });
});
