/** Mẫu hợp đồng thanh toán theo tiến độ (lab TicketChain). */

export const PAYMENT_CONTRACT_TEMPLATES = [
  {
    key: "tieu_chuan",
    label: "Tiêu chuẩn 3 đợt (30–40–30)",
    description:
      "Tạm ứng khi ký HĐ → giữa kỳ khi bán 50% vé → quyết toán khi sold-out.",
    useOnChainRevenue: true,
    stages: [
      {
        code: "D1",
        name: "Tạm ứng ký hợp đồng",
        percent: 30,
        trigger: "manual",
        triggerValue: "",
        description: "Thanh toán ngay sau khi hai bên ký HĐ.",
        sortOrder: 0,
      },
      {
        code: "D2",
        name: "Thanh toán giữa kỳ",
        percent: 40,
        trigger: "sales_pct",
        triggerValue: "50",
        description: "Khi tỷ lệ vé đã bán đạt tối thiểu 50%.",
        sortOrder: 1,
      },
      {
        code: "D3",
        name: "Quyết toán sold-out",
        percent: 30,
        trigger: "sold_out",
        triggerValue: "",
        description: "Khi sự kiện bán hết vé (hoặc kết thúc bán).",
        sortOrder: 2,
      },
    ],
  },
  {
    key: "tam_ung_nhe",
    label: "Tạm ứng nhẹ (20–50–30)",
    description: "Giảm tạm ứng đầu kỳ, tăng đợt giữa kỳ theo tiến độ bán.",
    useOnChainRevenue: true,
    stages: [
      {
        code: "D1",
        name: "Tạm ứng khởi động",
        percent: 20,
        trigger: "manual",
        triggerValue: "",
        description: "Ứng trước chi phí chuẩn bị sự kiện.",
        sortOrder: 0,
      },
      {
        code: "D2",
        name: "Thanh toán theo doanh số",
        percent: 50,
        trigger: "sales_pct",
        triggerValue: "60",
        description: "Khi bán được từ 60% vé trở lên.",
        sortOrder: 1,
      },
      {
        code: "D3",
        name: "Quyết toán cuối",
        percent: 30,
        trigger: "sold_out",
        triggerValue: "",
        description: "Tất toán sau khi bán hết / đóng bán.",
        sortOrder: 2,
      },
    ],
  },
  {
    key: "hai_dot",
    label: "Hai đợt (50–50)",
    description: "50% khi ký HĐ, 50% khi sold-out — phù hợp sự kiện ngắn.",
    useOnChainRevenue: true,
    stages: [
      {
        code: "D1",
        name: "Đợt 1 — Ký HĐ",
        percent: 50,
        trigger: "manual",
        triggerValue: "",
        description: "Thanh toán 50% giá trị HĐ khi ký.",
        sortOrder: 0,
      },
      {
        code: "D2",
        name: "Đợt 2 — Quyết toán",
        percent: 50,
        trigger: "sold_out",
        triggerValue: "",
        description: "Thanh toán 50% còn lại khi bán hết vé.",
        sortOrder: 1,
      },
    ],
  },
  {
    key: "bon_moc",
    label: "Bốn mốc bán vé (25×4)",
    description: "Chia đều 25% tại các mốc 25% / 50% / 75% / sold-out.",
    useOnChainRevenue: true,
    stages: [
      {
        code: "D1",
        name: "Mốc 25% vé",
        percent: 25,
        trigger: "sales_pct",
        triggerValue: "25",
        description: "Khi đạt 25% vé đã bán.",
        sortOrder: 0,
      },
      {
        code: "D2",
        name: "Mốc 50% vé",
        percent: 25,
        trigger: "sales_pct",
        triggerValue: "50",
        description: "Khi đạt 50% vé đã bán.",
        sortOrder: 1,
      },
      {
        code: "D3",
        name: "Mốc 75% vé",
        percent: 25,
        trigger: "sales_pct",
        triggerValue: "75",
        description: "Khi đạt 75% vé đã bán.",
        sortOrder: 2,
      },
      {
        code: "D4",
        name: "Sold-out / quyết toán",
        percent: 25,
        trigger: "sold_out",
        triggerValue: "",
        description: "Đợt cuối khi bán hết vé.",
        sortOrder: 3,
      },
    ],
  },
  {
    key: "co_dinh_tong",
    label: "Tổng cố định (không theo on-chain)",
    description:
      "Giống tiêu chuẩn 30–40–30 nhưng thanh toán theo tổng ETH cố định trên HĐ.",
    useOnChainRevenue: false,
    stages: [
      {
        code: "D1",
        name: "Tạm ứng ký hợp đồng",
        percent: 30,
        trigger: "manual",
        triggerValue: "",
        description: "30% tổng giá trị HĐ đã thỏa thuận.",
        sortOrder: 0,
      },
      {
        code: "D2",
        name: "Thanh toán giữa kỳ",
        percent: 40,
        trigger: "sales_pct",
        triggerValue: "50",
        description: "40% khi bán được 50% vé.",
        sortOrder: 1,
      },
      {
        code: "D3",
        name: "Quyết toán",
        percent: 30,
        trigger: "sold_out",
        triggerValue: "",
        description: "30% còn lại khi sold-out.",
        sortOrder: 2,
      },
    ],
  },
];

export const TRIGGER_LABELS = {
  manual: "Thủ công (admin mở đợt)",
  sales_pct: "Theo % vé đã bán",
  sold_out: "Khi bán hết vé",
  date: "Theo ngày đến hạn",
};

export const CONTRACT_STATUS_LABELS = {
  draft: "Nháp",
  active: "Đang hiệu lực",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export const STAGE_STATUS_LABELS = {
  pending: "Chờ điều kiện",
  payable: "Đến hạn thanh toán",
  paid: "Đã thanh toán",
  skipped: "Bỏ qua",
};

export function getPaymentContractTemplate(key) {
  return (
    PAYMENT_CONTRACT_TEMPLATES.find((t) => t.key === key) ||
    PAYMENT_CONTRACT_TEMPLATES[0]
  );
}

export function listPaymentContractTemplates() {
  return PAYMENT_CONTRACT_TEMPLATES.map((t) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    useOnChainRevenue: t.useOnChainRevenue,
    stages: t.stages.map((s) => ({ ...s })),
    stageCount: t.stages.length,
    percentSum: t.stages.reduce((n, s) => n + Number(s.percent || 0), 0),
  }));
}

export function stagesFromTemplate(key) {
  const t = getPaymentContractTemplate(key);
  return (t.stages || []).map((s, i) => ({
    code: s.code,
    name: s.name,
    percent: s.percent,
    trigger: s.trigger,
    triggerValue: s.triggerValue || "",
    description: s.description || "",
    sortOrder: s.sortOrder ?? i,
    status: "pending",
  }));
}

export function triggerLabel(trigger) {
  return TRIGGER_LABELS[trigger] || trigger || "—";
}

export function formatTriggerDetail(stage) {
  if (!stage) return "—";
  if (stage.trigger === "sales_pct") {
    return `Khi bán ≥ ${stage.triggerValue || "?"} % vé`;
  }
  if (stage.trigger === "date") {
    return `Đến hạn: ${stage.triggerValue || "—"}`;
  }
  if (stage.trigger === "sold_out") return "Khi sold-out";
  return "Admin mở đợt thủ công";
}
