import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Eye,
  Download,
  Ban,
  Printer,
  Loader2,
  Receipt,
  Coins,
  Percent,
  Info,
} from "lucide-react";
import { getAdminInvoices, voidAdminInvoice } from "../../services/api.js";
import { downloadInvoicePdfById, openInvoicePdfById } from "../../utils/invoicePdf.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

function moneyEth(n) {
  const v = Number(n) || 0;
  if (v === 0) return "0";
  return `${v.toFixed(6).replace(/\.?0+$/, "")} ETH`;
}

function short(addr) {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function statusMeta(s) {
  if (s === "paid") return { label: "Đã thanh toán", tone: "ok" };
  if (s === "void") return { label: "Đã hủy", tone: "warn" };
  return { label: "Nháp", tone: "" };
}

function formatDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

export default function AdminInvoicesPanel({ onMessage }) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ count: 0, amountGross: 0, vatAmount: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminInvoices({
        q: q.trim() || undefined,
        status: status || undefined,
        limit: 200,
      });
      const list = data.invoices || [];
      setRows(list);
      setStats(data.stats || { count: 0, amountGross: 0, vatAmount: 0 });
      setDetail((prev) => (prev ? list.find((r) => r.id === prev.id) || prev : null));
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message || "Không tải được hóa đơn");
    } finally {
      setLoading(false);
    }
  }, [q, status, onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  async function onView(id) {
    setBusyId(id);
    try {
      const { popupBlocked, url } = await openInvoicePdfById(id);
      if (popupBlocked && url) {
        onMessage?.("Popup bị chặn — mở tab mới thủ công hoặc Tải PDF.");
        window.location.assign(url);
      }
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function onDownload(inv) {
    setBusyId(inv.id);
    try {
      await downloadInvoicePdfById(inv.id, `${inv.invoiceNo}.pdf`);
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function requestVoid(inv) {
    if (!inv || inv.status === "void") return;
    setVoidTarget(inv);
  }

  async function confirmVoid(reason) {
    const inv = voidTarget;
    if (!inv) return;
    setBusyId(inv.id);
    try {
      await voidAdminInvoice(inv.id, reason);
      onMessage?.(`Đã hủy hóa đơn ${inv.invoiceNo}`);
      setVoidTarget(null);
      if (detail?.id === inv.id) setDetail(null);
      await load();
    } catch (err) {
      onMessage?.(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  const detailSt = detail ? statusMeta(detail.status) : null;

  return (
    <div className="lte-panel">
      <div className="lte-stats-grid">
        <div className="lte-stat-card">
          <div className="lte-stat-icon tone-teal">
            <Receipt size={18} />
          </div>
          <div>
            <span>Số HĐ còn hiệu lực</span>
            <strong>{stats.count ?? 0}</strong>
          </div>
        </div>
        <div className="lte-stat-card">
          <div className="lte-stat-icon tone-sky">
            <Coins size={18} />
          </div>
          <div>
            <span>Doanh thu (gross)</span>
            <strong>{moneyEth(stats.amountGross)}</strong>
          </div>
        </div>
        <div className="lte-stat-card">
          <div className="lte-stat-icon tone-amber">
            <Percent size={18} />
          </div>
          <div>
            <span>Tổng GTGT</span>
            <strong>{moneyEth(stats.vatAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <FileText size={18} /> Danh sách hóa đơn
          </h3>
          <form
            className="lte-filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <label className="lte-search-field">
              <Search size={15} aria-hidden />
              <input
                type="search"
                placeholder="Số HĐ, email, ví, tên…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Tìm hóa đơn"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Lọc trạng thái"
            >
              <option value="">Mọi trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="draft">Nháp</option>
              <option value="void">Đã hủy</option>
            </select>
            <button type="submit" className="lte-btn lte-btn-primary" disabled={loading}>
              <Search size={14} /> Lọc
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              onClick={load}
              disabled={loading}
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? "spin" : undefined} />
            </button>
          </form>
        </div>

        <div className="lte-box-body lte-box-body-flush">
          {loading && !rows.length ? (
            <p className="lte-empty">
              <Loader2 size={16} className="spin" /> Đang tải hóa đơn…
            </p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Số hóa đơn</th>
                    <th>Ngày</th>
                    <th>Người mua</th>
                    <th>Chưa thuế</th>
                    <th>GTGT</th>
                    <th>Tổng</th>
                    <th>Trạng thái</th>
                    <th>PDF</th>
                    <th className="lte-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv) => {
                    const st = statusMeta(inv.status);
                    return (
                      <tr key={inv.id}>
                        <td>
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            style={{ padding: "0.15rem 0.45rem", fontSize: "0.85rem" }}
                            onClick={() => setDetail(inv)}
                            title="Xem chi tiết"
                          >
                            <code className="lte-code">{inv.invoiceNo}</code>
                          </button>
                        </td>
                        <td className="lte-nowrap">{formatDate(inv.issuedAt)}</td>
                        <td>
                          <div className="lte-cell-stack">
                            <strong>{inv.buyer?.name || "—"}</strong>
                            <span>{inv.buyer?.email || "—"}</span>
                            <code className="lte-code muted">{short(inv.buyer?.wallet)}</code>
                          </div>
                        </td>
                        <td className="lte-nowrap">{moneyEth(inv.amountNet)}</td>
                        <td className="lte-nowrap">{moneyEth(inv.vatAmount)}</td>
                        <td className="lte-nowrap">
                          <strong>{moneyEth(inv.amountGross)}</strong>
                        </td>
                        <td>
                          <span className={`lte-badge ${st.tone}`}>{st.label}</span>
                        </td>
                        <td>
                          <span className={`lte-badge ${inv.hasPdf ? "ok" : ""}`}>
                            {inv.hasPdf ? "Có" : "—"}
                          </span>
                        </td>
                        <td>
                          <div className="lte-action-group">
                            <button
                              type="button"
                              className="lte-icon-btn"
                              title="Chi tiết"
                              onClick={() => setDetail(inv)}
                            >
                              <Info size={14} />
                            </button>
                            <button
                              type="button"
                              className="lte-icon-btn primary"
                              disabled={busyId === inv.id || !inv.hasPdf}
                              title="Xem PDF"
                              onClick={() => onView(inv.id)}
                            >
                              {busyId === inv.id ? (
                                <Loader2 size={14} className="spin" />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="lte-icon-btn"
                              disabled={busyId === inv.id || !inv.hasPdf}
                              title="Tải PDF"
                              onClick={() => onDownload(inv)}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              className="lte-icon-btn"
                              disabled={busyId === inv.id || !inv.hasPdf}
                              title="In PDF"
                              onClick={() => onView(inv.id)}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              className="lte-icon-btn danger"
                              disabled={busyId === inv.id || inv.status === "void"}
                              title="Hủy hóa đơn"
                              onClick={() => requestVoid(inv)}
                            >
                              <Ban size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length && !loading ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="lte-empty">
                          Chưa có hóa đơn. Sau khi user mua vé, PDF sẽ xuất hiện tại đây.
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminModal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Chi tiết hóa đơn"
        subtitle={detail?.invoiceNo}
        icon={Receipt}
        footer={
          detail ? (
            <>
              <button type="button" className="lte-btn lte-btn-default" onClick={() => setDetail(null)}>
                Đóng
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busyId === detail.id || !detail.hasPdf}
                onClick={() => onView(detail.id)}
              >
                <Eye size={15} /> Xem PDF
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busyId === detail.id || !detail.hasPdf}
                onClick={() => onDownload(detail)}
              >
                <Download size={15} /> Tải
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-danger"
                disabled={busyId === detail.id || detail.status === "void"}
                onClick={() => requestVoid(detail)}
              >
                <Ban size={15} /> Hủy
              </button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="lte-form" style={{ maxWidth: "none" }}>
            <div className="lte-form-grid">
              <label>
                Số hóa đơn
                <input value={detail.invoiceNo || ""} readOnly />
              </label>
              <label>
                Trạng thái
                <div style={{ paddingTop: 6 }}>
                  <span className={`lte-badge ${detailSt?.tone || ""}`}>{detailSt?.label}</span>
                  {detail.hasPdf ? (
                    <span className="lte-badge ok" style={{ marginLeft: 6 }}>
                      Có PDF
                    </span>
                  ) : null}
                </div>
              </label>
              <label>
                Người mua
                <input value={detail.buyer?.name || "—"} readOnly />
              </label>
              <label>
                Email
                <input value={detail.buyer?.email || "—"} readOnly />
              </label>
              <label>
                Ví
                <input value={detail.buyer?.wallet || "—"} readOnly />
              </label>
              <label>
                Ngày phát hành
                <input value={formatDate(detail.issuedAt)} readOnly />
              </label>
              <label>
                Chưa thuế (net)
                <input value={moneyEth(detail.amountNet)} readOnly />
              </label>
              <label>
                GTGT
                <input value={moneyEth(detail.vatAmount)} readOnly />
              </label>
              <label>
                Tổng (gross)
                <input value={moneyEth(detail.amountGross)} readOnly />
              </label>
              <label>
                Cập nhật
                <input value={formatDate(detail.updatedAt || detail.voidedAt)} readOnly />
              </label>
            </div>
            {detail.voidReason ? (
              <label>
                Lý do hủy
                <textarea rows={2} value={detail.voidReason} readOnly />
              </label>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        onConfirm={confirmVoid}
        title="Hủy hóa đơn"
        message={
          voidTarget
            ? `Nhập lý do hủy hóa đơn ${voidTarget.invoiceNo}. Thao tác này không thể hoàn tác.`
            : undefined
        }
        confirmLabel="Hủy hóa đơn"
        cancelLabel="Đóng"
        tone="danger"
        icon={Ban}
        promptLabel="Lý do hủy"
        promptDefault="Hủy bởi admin"
        promptRequired
        busy={busyId != null}
      />
    </div>
  );
}
