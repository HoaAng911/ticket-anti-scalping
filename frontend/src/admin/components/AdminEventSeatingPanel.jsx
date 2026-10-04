import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  RefreshCw,
  Loader2,
  Lock,
  Unlock,
  TimerOff,
  RotateCcw,
  MapPin,
  CalendarDays,
} from "lucide-react";
import {
  getAdminDashboard,
  getAdminEventSeating,
  manageAdminEventSeats,
  generateAdminEventSeating,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const ACTIONS = [
  {
    id: "block",
    label: "Khóa ghế trống",
    hint: "Ghế available → không bán (blocked)",
    icon: Lock,
    tone: "warn",
    needStatus: "available",
  },
  {
    id: "unblock",
    label: "Mở bán lại",
    hint: "Ghế blocked → available",
    icon: Unlock,
    tone: "ok",
    needStatus: "blocked",
  },
  {
    id: "releaseHold",
    label: "Giải phóng hold",
    hint: "Ghế đang giữ → available",
    icon: TimerOff,
    tone: "default",
    needStatus: "held",
  },
  {
    id: "reopenSold",
    label: "Mở lại ghế đã bán",
    hint: "Lab: sold → available (không burn NFT)",
    icon: RotateCcw,
    tone: "danger",
    needStatus: "sold",
  },
];

function StatCard({ label, value, tone }) {
  return (
    <div className={`lte-seat-stat ${tone || ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function AdminEventSeatingPanel({ onMessage }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [detail, setDetail] = useState(null);
  const [zoneFilter, setZoneFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [genOpen, setGenOpen] = useState(false);

  function notify(text) {
    onMessage?.(text);
  }

  async function loadEvents() {
    const dash = await getAdminDashboard();
    const list = (dash.events || []).map((ev) => ({
      id: ev._id || ev.id,
      title: ev.title,
      location: ev.location,
      startTime: ev.startTime,
      seatingEnabled: Boolean(ev.seating?.enabled),
      zones: ev.seating?.zones?.length || 0,
      sold: (ev.seating?.zones || []).reduce((n, z) => n + (Number(z.sold) || 0), 0),
      available: (ev.seating?.zones || []).reduce((n, z) => n + (Number(z.available) || 0), 0),
      total: (ev.seating?.zones || []).reduce((n, z) => n + (Number(z.total) || 0), 0),
    }));
    setEvents(list);
    return list;
  }

  async function loadDetail(id) {
    if (!id) {
      setDetail(null);
      return;
    }
    const data = await getAdminEventSeating(id);
    setDetail(data);
    setSelected([]);
    if (!zoneFilter && data.seating?.zones?.[0]?.code) {
      setZoneFilter(data.seating.zones[0].code);
    }
  }

  async function refreshAll(keepId = eventId) {
    setBusy(true);
    try {
      const list = await loadEvents();
      const id = keepId || list[0]?.id || "";
      if (id && !keepId) setEventId(id);
      if (id) await loadDetail(id);
      else setDetail(null);
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setBusy(true);
    loadDetail(eventId)
      .catch((e) => notify(e.response?.data?.error || e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const stats = detail?.seating?.stats;
  const zones = detail?.seating?.zones || [];
  const activeZone = zones.find((z) => z.code === zoneFilter) || zones[0];

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleSeat(seat) {
    setSelected((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]
    );
  }

  function selectByStatus(status) {
    if (!activeZone) return;
    const ids = (activeZone.rows || []).flatMap((r) =>
      (r.seats || []).filter((s) => s.status === status).map((s) => s.id)
    );
    setSelected(ids);
  }

  async function runAction(actionId) {
    if (!eventId || !selected.length) return;
    setBusy(true);
    try {
      const data = await manageAdminEventSeats(eventId, {
        action: actionId,
        seatIds: selected,
      });
      setDetail((d) =>
        d
          ? {
              ...d,
              seating: data.seating,
            }
          : d
      );
      setSelected([]);
      notify(data.message || "Đã cập nhật ghế");
      await loadEvents();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  async function onGenerate(force) {
    if (!eventId) return;
    setBusy(true);
    try {
      const data = await generateAdminEventSeating(eventId, {
        force,
        rowsPerZone: 4,
        seatsPerRow: 8,
      });
      setDetail((d) =>
        d
          ? {
              ...d,
              seating: data.seating,
            }
          : d
      );
      setGenOpen(false);
      notify(data.message || "Đã tạo sơ đồ ghế");
      await loadEvents();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedAction = ACTIONS.find((a) => a.id === confirmAction);

  return (
    <>
      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Armchair size={18} /> Ghế sự kiện — đã bán / trống
          </h3>
          <div className="lte-filter-bar">
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setZoneFilter("");
              }}
              aria-label="Chọn sự kiện"
              disabled={busy}
            >
              <option value="">— Chọn sự kiện —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                  {ev.seatingEnabled
                    ? ` · trống ${ev.available}/${ev.total} · bán ${ev.sold}`
                    : " · chưa có ghế"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => refreshAll(eventId)}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
            {eventId ? (
              <button
                type="button"
                className="lte-btn lte-btn-success"
                disabled={busy}
                onClick={() => setGenOpen(true)}
              >
                {detail?.seating?.enabled ? "Tạo lại sơ đồ" : "Tạo sơ đồ ghế"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="lte-box-body">
          {!eventId ? (
            <p className="lte-help">Chọn sự kiện để xem số ghế đã bán và quản lý ghế trống.</p>
          ) : busy && !detail ? (
            <p className="lte-help">
              <Loader2 size={14} className="spin" /> Đang tải sơ đồ ghế…
            </p>
          ) : !detail?.seating?.enabled ? (
            <div className="lte-empty">
              Sự kiện chưa có sơ đồ ghế. Bấm «Tạo sơ đồ ghế» để sinh theo hạng vé.
            </div>
          ) : (
            <>
              <div className="lte-seat-meta">
                <div>
                  <strong>{detail.title}</strong>
                  <p className="lte-help" style={{ marginTop: 4 }}>
                    <MapPin size={13} style={{ verticalAlign: -2 }} /> {detail.location || "—"}
                    {" · "}
                    <CalendarDays size={13} style={{ verticalAlign: -2 }} />{" "}
                    {detail.startTime
                      ? new Date(detail.startTime).toLocaleString("vi-VN")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="lte-seat-stats">
                <StatCard label="Tổng ghế" value={stats?.total ?? 0} />
                <StatCard label="Trống (bán được)" value={stats?.available ?? 0} tone="ok" />
                <StatCard label="Đã bán" value={stats?.sold ?? 0} tone="sold" />
                <StatCard label="Đang giữ" value={stats?.held ?? 0} tone="held" />
                <StatCard label="Khóa bán" value={stats?.blocked ?? 0} tone="blocked" />
              </div>

              <div className="lte-table-wrap" style={{ marginBottom: 14 }}>
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>Khu / hạng</th>
                      <th>ChainId</th>
                      <th>Tổng</th>
                      <th>Trống</th>
                      <th>Đã bán</th>
                      <th>Hold</th>
                      <th>Khóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.zones || []).map((z) => (
                      <tr
                        key={z.code}
                        className={z.code === activeZone?.code ? "lte-user-row-clickable" : ""}
                        onClick={() => setZoneFilter(z.code)}
                      >
                        <td>
                          <strong>{z.label}</strong> <span className="lte-badge">{z.code}</span>
                        </td>
                        <td>{z.eventChainId}</td>
                        <td>{z.total}</td>
                        <td>{z.available}</td>
                        <td>{z.sold}</td>
                        <td>{z.held}</td>
                        <td>{z.blocked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lte-seat-toolbar">
                <div className="lte-seat-zone-tabs">
                  {zones.map((z) => (
                    <button
                      key={z.code}
                      type="button"
                      className={`lte-user-tab${activeZone?.code === z.code ? " is-active" : ""}`}
                      onClick={() => {
                        setZoneFilter(z.code);
                        setSelected([]);
                      }}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <div className="lte-action-group">
                  <button
                    type="button"
                    className="lte-btn lte-btn-default"
                    onClick={() => selectByStatus("available")}
                  >
                    Chọn trống
                  </button>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default"
                    onClick={() => selectByStatus("blocked")}
                  >
                    Chọn khóa
                  </button>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default"
                    onClick={() => selectByStatus("held")}
                  >
                    Chọn hold
                  </button>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default"
                    onClick={() => setSelected([])}
                  >
                    Bỏ chọn ({selected.length})
                  </button>
                </div>
              </div>

              <div className="lte-seat-legend">
                <span>
                  <i className="lte-seat-dot available" /> Trống
                </span>
                <span>
                  <i className="lte-seat-dot sold" /> Đã bán
                </span>
                <span>
                  <i className="lte-seat-dot held" /> Đang giữ
                </span>
                <span>
                  <i className="lte-seat-dot blocked" /> Khóa bán
                </span>
                <span>
                  <i className="lte-seat-dot selected" /> Đang chọn
                </span>
              </div>

              <div className="lte-seat-screen">{detail.seating.screenLabel || "SÂN KHẤU"}</div>

              <div className="lte-seat-map">
                {(activeZone?.rows || []).map((row) => (
                  <div key={row.row} className="lte-seat-row">
                    <span className="lte-seat-row-label">{row.row}</span>
                    <div className="lte-seat-row-seats">
                      {(row.seats || []).map((seat) => {
                        const isSel = selectedSet.has(seat.id);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={`lte-seat-cell ${seat.status}${isSel ? " is-selected" : ""}`}
                            title={`${seat.label} · ${seat.status}${
                              seat.tokenId != null ? ` · token #${seat.tokenId}` : ""
                            }${seat.heldBy ? ` · ${seat.heldBy.slice(0, 8)}…` : ""}`}
                            onClick={() => toggleSeat(seat)}
                            disabled={busy}
                          >
                            {seat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="lte-seat-actions">
                {ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`lte-btn ${
                        a.tone === "danger"
                          ? "lte-btn-danger"
                          : a.tone === "ok"
                            ? "lte-btn-success"
                            : "lte-btn-default"
                      }`}
                      disabled={busy || !selected.length}
                      title={a.hint}
                      onClick={() => setConfirmAction(a.id)}
                    >
                      <Icon size={14} /> {a.label}
                    </button>
                  );
                })}
              </div>
              <p className="lte-help" style={{ marginTop: 8 }}>
                Chọn ghế trên sơ đồ rồi dùng nút thao tác. «Khóa ghế trống» giảm ghế bán được; «Mở
                bán lại» trả ghế khóa về trống.
              </p>
            </>
          )}
        </div>
      </div>

      <AdminModal
        open={genOpen}
        onClose={busy ? undefined : () => setGenOpen(false)}
        title={detail?.seating?.enabled ? "Tạo lại sơ đồ ghế?" : "Tạo sơ đồ ghế"}
        subtitle="Sinh khu vực theo hạng vé (mỗi hạng = 1 zone)"
        icon={Armchair}
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => setGenOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-success"
              disabled={busy}
              onClick={() => onGenerate(Boolean(detail?.seating?.enabled))}
            >
              {busy ? <Loader2 size={14} className="spin" /> : null}{" "}
              {detail?.seating?.enabled ? "Tạo lại (force)" : "Tạo sơ đồ"}
            </button>
          </>
        }
      >
        <p className="lte-help">
          {detail?.seating?.enabled
            ? "Tạo lại sẽ reset toàn bộ ghế (kể cả đã bán / khóa). Chỉ dùng khi lab."
            : "Sẽ tạo ghế available theo totalSupply từng hạng vé."}
        </p>
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runAction(confirmAction)}
        title={selectedAction?.label || "Xác nhận?"}
        message={
          selectedAction
            ? `${selectedAction.hint}. Áp dụng cho ${selected.length} ghế đã chọn.`
            : undefined
        }
        confirmLabel="Áp dụng"
        tone={selectedAction?.tone === "danger" ? "danger" : "default"}
        icon={selectedAction?.icon}
        busy={busy}
      />
    </>
  );
}
