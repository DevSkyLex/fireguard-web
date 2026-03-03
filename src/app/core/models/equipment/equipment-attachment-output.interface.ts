import type { HydraItem } from '@core/models/api';

export interface EquipmentAttachmentOutput extends HydraItem {
  readonly id: string;
  readonly equipmentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly label: string | null;
  readonly uploadedAt: string;
}
