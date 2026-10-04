/** Catalog loại mục chương trình sự kiện */
export const PROGRAM_ITEM_TYPES = [
  { key: "performance", label: "Tiết mục / Biểu diễn" },
  { key: "speech", label: "Phát biểu / MC" },
  { key: "ceremony", label: "Lễ / Nghi thức" },
  { key: "break", label: "Nghỉ / Giao lưu" },
  { key: "other", label: "Khác" },
];

export function programItemTypeLabel(key) {
  return PROGRAM_ITEM_TYPES.find((t) => t.key === key)?.label || key || "—";
}

export function emptyProgramItem() {
  return {
    title: "",
    description: "",
    itemType: "performance",
    startAt: "",
    endAt: "",
    memberId: "",
    performer: "",
    performerRole: "",
    stage: "",
    sortOrder: 0,
    notes: "",
  };
}
