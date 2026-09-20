export type HeldPickGroup = "unique";

export interface HeldPickRow {
  id: string;
  name: string;
  disabled?: boolean;
  group?: string;
}

/**
 * Split held-item picker rows into selectable graded items and a disabled Unique Items group.
 */
export function partitionHeldPickerItems<T extends HeldPickRow>(
  items: readonly T[],
  isUniqueId: (id: string) => boolean,
): { regular: T[]; unique: Array<T & { disabled: true; group: "unique" }> } {
  const regular: T[] = [];
  const unique: Array<T & { disabled: true; group: "unique" }> = [];
  for (const item of items) {
    if (isUniqueId(item.id)) unique.push({ ...item, disabled: true, group: "unique" });
    else regular.push(item);
  }
  return { regular, unique };
}
