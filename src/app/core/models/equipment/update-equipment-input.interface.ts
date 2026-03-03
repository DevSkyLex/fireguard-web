export interface UpdateEquipmentInput {
  readonly type?: string;
  readonly subType?: string | null;
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly serialNumber?: string | null;
  readonly locationLabel?: string | null;
}
