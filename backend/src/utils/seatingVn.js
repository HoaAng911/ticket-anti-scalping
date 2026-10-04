/** Tạo sơ đồ ghế kiểu rạp — mỗi hạng vé = 1 khu vực */
const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function buildDefaultSeatingChart(ticketTypes = [], opts = {}) {
  const rowsPerZone = Math.max(1, Number(opts.rowsPerZone) || 4);
  const seatsPerRow = Math.max(2, Number(opts.seatsPerRow) || 8);

  const zones = (ticketTypes || []).map((t, idx) => {
    const code = String(t.name || `ZONE${idx + 1}`)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || `Z${idx + 1}`;
    const eventChainId = Number(t.eventChainId);
    const supply = Math.max(1, Number(t.totalSupply) || rowsPerZone * seatsPerRow);
    // Bố trí gần bằng supply
    let rows = rowsPerZone;
    let cols = seatsPerRow;
    while (rows * cols < supply && rows < 12) rows += 1;
    while (rows * cols < supply && cols < 16) cols += 1;
    // cắt ghế thừa nếu > supply
    let remaining = supply;
    const rowObjs = [];
    for (let r = 0; r < rows && remaining > 0; r++) {
      const letter = ROW_LETTERS[r] || `R${r + 1}`;
      const n = Math.min(cols, remaining);
      const seats = [];
      for (let s = 1; s <= n; s++) {
        seats.push({
          id: `${code}-${letter}-${s}`,
          label: `${letter}${s}`,
          status: "available",
          heldBy: "",
          heldUntil: null,
          tokenId: null,
        });
      }
      rowObjs.push({ row: letter, seats });
      remaining -= n;
    }
    return {
      code,
      label: t.name || code,
      eventChainId: Number.isFinite(eventChainId) ? eventChainId : idx + 1,
      rows: rowObjs,
    };
  });

  return {
    enabled: true,
    screenLabel: "SÂN KHẤU / MÀN HÌNH",
    holdMinutes: 8,
    maxSelect: 2,
    zones,
  };
}

export function expireHoldsInChart(chart, now = new Date()) {
  if (!chart?.zones) return { chart, changed: false };
  let changed = false;
  const ts = now.getTime();
  for (const zone of chart.zones) {
    for (const row of zone.rows || []) {
      for (const seat of row.seats || []) {
        if (seat.status === "held" && seat.heldUntil && new Date(seat.heldUntil).getTime() <= ts) {
          seat.status = "available";
          seat.heldBy = "";
          seat.heldUntil = null;
          changed = true;
        }
      }
    }
  }
  return { chart, changed };
}

export function flattenSeats(chart) {
  const list = [];
  for (const zone of chart?.zones || []) {
    for (const row of zone.rows || []) {
      for (const seat of row.seats || []) {
        list.push({
          ...seat,
          zoneCode: zone.code,
          zoneLabel: zone.label,
          eventChainId: zone.eventChainId,
          row: row.row,
        });
      }
    }
  }
  return list;
}

export function findSeat(chart, seatId) {
  for (const zone of chart?.zones || []) {
    for (const row of zone.rows || []) {
      for (const seat of row.seats || []) {
        if (seat.id === seatId) {
          return { seat, zone, row };
        }
      }
    }
  }
  return null;
}

export function seatingPublicView(chart) {
  if (!chart?.enabled) {
    return { enabled: false, zones: [], screenLabel: "", maxSelect: 2, holdMinutes: 8 };
  }
  expireHoldsInChart(chart);
  return {
    enabled: true,
    screenLabel: chart.screenLabel || "SÂN KHẤU / MÀN HÌNH",
    holdMinutes: chart.holdMinutes || 8,
    maxSelect: chart.maxSelect || 2,
    zones: (chart.zones || []).map((z) => {
      const seats = (z.rows || []).flatMap((r) => r.seats || []);
      const available = seats.filter((s) => effectiveSeatStatus(s) === "available").length;
      const held = seats.filter((s) => effectiveSeatStatus(s) === "held").length;
      const sold = seats.filter((s) => effectiveSeatStatus(s) === "sold").length;
      const blocked = seats.filter((s) => effectiveSeatStatus(s) === "blocked").length;
      return {
        code: z.code,
        label: z.label,
        eventChainId: z.eventChainId,
        available,
        held,
        sold,
        blocked,
        total: seats.length,
        rows: (z.rows || []).map((r) => ({
          row: r.row,
          seats: (r.seats || []).map((s) => ({
            id: s.id,
            label: s.label,
            status: effectiveSeatStatus(s),
          })),
        })),
      };
    }),
  };
}

/** Trạng thái ghế sau khi xét hạn hold */
export function effectiveSeatStatus(seat, now = Date.now()) {
  if (!seat) return "available";
  if (seat.status === "sold") return "sold";
  if (seat.status === "blocked") return "blocked";
  if (
    seat.status === "held" &&
    seat.heldUntil &&
    new Date(seat.heldUntil).getTime() > now
  ) {
    return "held";
  }
  if (seat.status === "held") return "available";
  return seat.status === "available" ? "available" : seat.status || "available";
}

export function seatingStats(chart) {
  const view = seatingPublicView(chart);
  const zones = view.zones || [];
  const sum = (key) => zones.reduce((n, z) => n + (Number(z[key]) || 0), 0);
  return {
    enabled: Boolean(view.enabled),
    total: sum("total"),
    available: sum("available"),
    held: sum("held"),
    sold: sum("sold"),
    blocked: sum("blocked"),
    zones: zones.map((z) => ({
      code: z.code,
      label: z.label,
      eventChainId: z.eventChainId,
      total: z.total,
      available: z.available,
      held: z.held,
      sold: z.sold,
      blocked: z.blocked,
    })),
  };
}

/** View admin: stats + ghế kèm heldBy / tokenId */
export function seatingAdminView(chart) {
  if (!chart?.enabled) {
    return {
      enabled: false,
      screenLabel: "",
      holdMinutes: 8,
      maxSelect: 2,
      stats: seatingStats(chart),
      zones: [],
    };
  }
  expireHoldsInChart(chart);
  const zones = (chart.zones || []).map((z) => ({
    code: z.code,
    label: z.label,
    eventChainId: z.eventChainId,
    rows: (z.rows || []).map((r) => ({
      row: r.row,
      seats: (r.seats || []).map((s) => ({
        id: s.id,
        label: s.label,
        status: effectiveSeatStatus(s),
        heldBy: s.heldBy || "",
        heldUntil: s.heldUntil || null,
        tokenId: s.tokenId ?? null,
      })),
    })),
  }));
  return {
    enabled: true,
    screenLabel: chart.screenLabel || "SÂN KHẤU / MÀN HÌNH",
    holdMinutes: chart.holdMinutes || 8,
    maxSelect: chart.maxSelect || 2,
    stats: seatingStats(chart),
    zones,
  };
}
