import { useEffect, useState } from "react";
import {
  Landmark,
  RefreshCw,
  Loader2,
  Send,
  Wallet,
  CheckCircle2,
  Building2,
  Pencil,
  Trash2,
  RotateCcw,
  Save,
  Plus,
  FileSignature,
  Percent,
} from "lucide-react";
import {
  getAdminEventPayouts,
  settleAdminEventPayout,
  updateAdminEventPayout,
  deleteAdminEventPayout,
  getAdminPaymentContracts,
  settleAdminPaymentStage,
  patchAdminPaymentStage,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const STAGE_STATUS_LABEL = {
  pending: "Chờ điều kiện",
  payable: "Đến hạn",
  paid: "Đã trả",
  skipped: "Bỏ qua",
};

const TRIGGER_LABEL = {
  manual: "Thủ công",
  sales_pct: "% vé đã bán",
  sold_out: "Sold-out",
  date: "Theo ngày",
};

function stageBadgeCls(status) {
  if (status === "paid") return "ok";
  if (status === "payable") return "warn";
  if (status === "skipped") return "danger";
  return "";
}

function statusBadge(row) {
  if (row.settlement?.status === "settled" || row.computedStatus === "settled") {
    return { cls: "ok", text: "Đã thanh toán" };
  }
  if (row.settlement?.status === "failed") {
    return { cls: "warn", text: "Settle lỗi" };
  }
  if (row.canSettle) {
    return { cls: "ok", text: "Sẵn sàng settle" };
  }
  if (row.soldOut) {
    return { cls: "warn", text: "Sold-out · thiếu ví/ETH" };
  }
  return { cls: "", text: "Đang bán" };
}

function emptyForm(row) {
  return {
    organizerProfileId: row?.organizerProfile?.id || row?.organizerProfileId || "",
    payoutWallet: row?.settlement?.payoutWallet || row?.payoutWallet || "",
    bankAccount: row?.settlement?.bankAccount || row?.bankAccount || "",
    bankName: row?.settlement?.bankName || row?.bankName || "",
    overrideAmountEth: row?.settlement?.overrideAmountEth || "",
    note: row?.settlement?.note || "",
    status: row?.settlement?.status || "none",
    txHash: row?.settlement?.txHash || "",
  };
}

export default function AdminEventPayoutPanel({ onMessage }) {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [settleTarget, setSettleTarget] = useState(null); // payout row
  const [settleContracts, setSettleContracts] = useState([]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [force, setForce] = useState(false);
  const [fullSettleConfirm, setFullSettleConfirm] = useState(false);
  const [editor, setEditor] = useState(null); // { mode: create|edit, row }
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hardDelete, setHardDelete] = useState(false);

  function notify(text) {
    onMessage?.(text);
  }

  async function load() {
    setBusy(true);
    try {
      const data = await getAdminEventPayouts();
      setRows(data.events || []);
      setProfiles(data.profiles || []);
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const activeSettleContract =
    settleContracts.find((c) => c.id === selectedContractId) || settleContracts[0] || null;

  async function openSettle(row) {
    setSettleTarget(row);
    setForce(!row.canSettle);
    setFullSettleConfirm(false);
    setSettleContracts([]);
    setSelectedContractId("");
    setSettleLoading(true);
    try {
      const data = await getAdminPaymentContracts({ eventId: row.eventId });
      const list = (data.contracts || []).filter((c) => c.status !== "cancelled");
      // Ưu tiên HĐ active / completed, rồi draft
      list.sort((a, b) => {
        const rank = (s) => (s === "active" ? 0 : s === "completed" ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });
      setSettleContracts(list);
      setSelectedContractId(list[0]?.id || "");
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setSettleLoading(false);
    }
  }

  async function refreshSettleContract() {
    if (!settleTarget?.eventId) return;
    setSettleLoading(true);
    try {
      const data = await getAdminPaymentContracts({ eventId: settleTarget.eventId });
      const list = (data.contracts || []).filter((c) => c.status !== "cancelled");
      list.sort((a, b) => {
        const rank = (s) => (s === "active" ? 0 : s === "completed" ? 1 : 2);
        return rank(a.status) - rank(b.status);
      });
      setSettleContracts(list);
      setSelectedContractId((prev) =>
        list.some((c) => c.id === prev) ? prev : list[0]?.id || ""
      );
      await load();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setSettleLoading(false);
    }
  }

  function closeSettle() {
    if (busy) return;
    setSettleTarget(null);
    setSettleContracts([]);
    setSelectedContractId("");
    setForce(false);
    setFullSettleConfirm(false);
  }

  function openCreate() {
    const first = rows.find((r) => r.settlement?.status !== "settled") || rows[0];
    if (!first) {
      notify("Chưa có sự kiện để cấu hình thanh toán.");
      return;
    }
    setEditor({ mode: "create", row: first });
    setForm(emptyForm(first));
  }

  function openEdit(row) {
    setEditor({ mode: "edit", row });
    setForm(emptyForm(row));
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onPickProfile(profileId) {
    const p = profiles.find((x) => x.id === profileId);
    setForm((f) => ({
      ...f,
      organizerProfileId: profileId,
      payoutWallet: f.payoutWallet || p?.payoutWallet || "",
      bankAccount: f.bankAccount || p?.bankAccount || "",
      bankName: f.bankName || p?.bankName || "",
    }));
  }

  async function onSaveConfig(e) {
    e?.preventDefault?.();
    if (!editor?.row?.eventId) return;
    setBusy(true);
    try {
      const payload = {
        organizerProfileId: form.organizerProfileId || null,
        payoutWallet: form.payoutWallet.trim(),
        bankAccount: form.bankAccount.trim(),
        bankName: form.bankName.trim(),
        overrideAmountEth: form.overrideAmountEth.trim(),
        note: form.note.trim(),
      };
      // Cho phép đánh dấu settled thủ công (lab) kèm txHash
      if (form.status === "settled" && editor.row.settlement?.status !== "settled") {
        payload.status = "settled";
        payload.txHash = form.txHash.trim();
        if (form.overrideAmountEth.trim()) payload.amountEth = form.overrideAmountEth.trim();
      } else if (form.status === "none" || form.status === "ready" || form.status === "failed") {
        if (form.status !== editor.row.settlement?.status) {
          payload.status = form.status;
        }
      }

      const data = await updateAdminEventPayout(editor.row.eventId, payload);
      notify(data.message || "Đã lưu cấu hình thanh toán");
      setEditor(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmFullSettle() {
    if (!settleTarget) return;
    setBusy(true);
    try {
      const data = await settleAdminEventPayout(settleTarget.eventId, {
        force,
        note: settleTarget.settlement?.note || "Admin settle full",
        amountEth: settleTarget.settlement?.overrideAmountEth || undefined,
      });
      notify(data.message || `Đã settle ${data.amountEth} ETH`);
      setFullSettleConfirm(false);
      closeSettle();
      await load();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function settleStage(stage) {
    if (!activeSettleContract?.id || !stage?.id) return;
    setBusy(true);
    try {
      const data = await settleAdminPaymentStage(activeSettleContract.id, stage.id, {
        force,
        note: `Settle từ màn Thanh toán BTC — ${settleTarget?.title || ""}`,
      });
      notify(data.message || `Đã trả đợt ${stage.code} (${stage.percent}%)`);
      await refreshSettleContract();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openStage(stage) {
    if (!activeSettleContract?.id || !stage?.id) return;
    setBusy(true);
    try {
      await patchAdminPaymentStage(activeSettleContract.id, stage.id, { status: "payable" });
      notify(`Đã mở đợt «${stage.name}» đến hạn thanh toán.`);
      await refreshSettleContract();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const data = await deleteAdminEventPayout(deleteTarget.eventId, { hard: hardDelete });
      notify(data.message || "Đã xóa/reset thanh toán");
      setDeleteTarget(null);
      setHardDelete(false);
      await load();
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  const editingRow = editor?.row;

  return (
    <>
      <div className="lte-box">
        <div className="lte-box-header lte-box-header-tools">
          <h3>
            <Landmark size={18} /> Thanh toán Ban tổ chức
          </h3>
          <div className="lte-filter-bar">
            <button type="button" className="lte-btn lte-btn-success" disabled={busy} onClick={openCreate}>
              <Plus size={14} /> Cấu hình / điều chỉnh
            </button>
            <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={load}>
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>
        <div className="lte-box-body">
          <p className="lte-help" style={{ marginBottom: 12 }}>
            Cấu hình ví / đơn vị BTC theo sự kiện. Bấm <strong>Settle</strong> để mở popup thanh toán
            theo từng đợt căn cứ hợp đồng tiến độ (% định mức); nếu chưa có HĐ có thể settle toàn bộ.
          </p>

          {busy && !rows.length ? (
            <p className="lte-help">
              <Loader2 size={14} className="spin" /> Đang tải…
            </p>
          ) : (
            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Sự kiện</th>
                    <th>Ban tổ chức</th>
                    <th>Bán vé</th>
                    <th>Doanh thu</th>
                    <th>Ví nhận</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const badge = statusBadge(row);
                    return (
                      <tr key={row.eventId}>
                        <td>
                          <strong>{row.title}</strong>
                          {row.error ? (
                            <p className="lte-help" style={{ color: "#dc2626" }}>
                              {row.error}
                            </p>
                          ) : null}
                          {row.settlement?.note ? (
                            <div className="lte-help">Ghi chú: {row.settlement.note}</div>
                          ) : null}
                        </td>
                        <td>
                          {row.organizerProfile ? (
                            <>
                              <Building2 size={13} style={{ verticalAlign: -2 }} />{" "}
                              {row.organizerProfile.organizationName}
                              <div className="lte-help">{row.organizerProfile.profileCode}</div>
                            </>
                          ) : (
                            <span className="lte-help">Chưa gắn đơn vị</span>
                          )}
                        </td>
                        <td>
                          {row.totalSold ?? 0}/{row.totalSupply ?? 0}
                          <div className="lte-help">còn {row.totalRemaining ?? "—"}</div>
                        </td>
                        <td>
                          <strong>{row.amountEth ?? "0"} ETH</strong>
                          {row.usingOverrideAmount ? (
                            <div className="lte-help">override (on-chain {row.onChainAmountEth})</div>
                          ) : null}
                        </td>
                        <td className="mono">
                          {row.payoutWallet ? (
                            <>
                              <Wallet size={13} /> {row.payoutWallet.slice(0, 8)}…
                              {row.payoutWallet.slice(-4)}
                            </>
                          ) : (
                            <span className="lte-help">Chưa cấu hình</span>
                          )}
                          {row.bankAccount ? (
                            <div className="lte-help">
                              {row.bankName || "NH"} · {row.bankAccount}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`lte-badge ${badge.cls}`}>{badge.text}</span>
                          {row.settlement?.txHash ? (
                            <div className="lte-help mono">
                              tx {row.settlement.txHash.slice(0, 10)}…
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className="lte-action-group">
                            <button
                              type="button"
                              className="lte-btn lte-btn-default"
                              disabled={busy}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil size={14} /> Sửa
                            </button>
                            <button
                              type="button"
                              className="lte-btn lte-btn-primary"
                              disabled={busy}
                              onClick={() => openSettle(row)}
                              title="Thanh toán theo đợt HĐ / settle"
                            >
                              {row.settlement?.status === "settled" ? (
                                <>
                                  <Percent size={14} /> Đợt HĐ
                                </>
                              ) : (
                                <>
                                  <Send size={14} /> Settle
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="lte-btn lte-btn-default"
                              disabled={busy}
                              title="Reset trạng thái settle"
                              onClick={() => {
                                setHardDelete(false);
                                setDeleteTarget(row);
                              }}
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              type="button"
                              className="lte-btn lte-btn-danger"
                              disabled={busy}
                              title="Xóa hết cấu hình thanh toán"
                              onClick={() => {
                                setHardDelete(true);
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="lte-empty">Chưa có sự kiện.</div>
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
        open={Boolean(editor)}
        onClose={busy ? undefined : () => setEditor(null)}
        title={editor?.mode === "create" ? "Cấu hình thanh toán" : "Điều chỉnh thanh toán"}
        subtitle={editingRow?.title || "Ví · đơn vị BTC · số ETH · ghi chú"}
        icon={Landmark}
        size="lg"
        closeOnBackdrop={!busy}
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => setEditor(null)}
            >
              Đóng
            </button>
            <button
              type="submit"
              form="admin-payout-form"
              className="lte-btn lte-btn-primary"
              disabled={busy}
            >
              <Save size={15} /> {busy ? "Đang lưu…" : "Lưu cấu hình"}
            </button>
          </>
        }
      >
        <form id="admin-payout-form" className="lte-form" onSubmit={onSaveConfig}>
          <section className="lte-perm-section">
            <h4 className="lte-perm-section-title">Sự kiện & Ban tổ chức</h4>
            <div className="lte-perm-profile-grid">
              <label className="lte-perm-span-2">
                Sự kiện
                <select
                  value={editor?.row?.eventId || ""}
                  disabled={editor?.mode === "edit" || busy}
                  onChange={(e) => {
                    const row = rows.find((r) => r.eventId === e.target.value);
                    if (!row) return;
                    setEditor({ mode: editor?.mode || "create", row });
                    setForm(emptyForm(row));
                  }}
                >
                  {rows.map((r) => (
                    <option key={r.eventId} value={r.eventId}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lte-perm-span-2">
                Đơn vị Ban tổ chức
                <select
                  value={form.organizerProfileId}
                  onChange={(e) => onPickProfile(e.target.value)}
                  disabled={busy}
                >
                  <option value="">— Chưa gắn —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.organizationName} ({p.profileCode})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="lte-perm-section">
            <h4 className="lte-perm-section-title">Ví & tài khoản nhận tiền</h4>
            <div className="lte-perm-profile-grid">
              <label className="lte-perm-span-2">
                Ví nhận (override sự kiện)
                <input
                  value={form.payoutWallet}
                  onChange={(e) => setField("payoutWallet", e.target.value)}
                  placeholder="0x… (ưu tiên hơn ví trên hồ sơ BTC)"
                  disabled={busy}
                />
              </label>
              <label>
                Số TK ngân hàng
                <input
                  value={form.bankAccount}
                  onChange={(e) => setField("bankAccount", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Ngân hàng
                <input
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Số ETH override (tuỳ chọn)
                <input
                  value={form.overrideAmountEth}
                  onChange={(e) => setField("overrideAmountEth", e.target.value)}
                  placeholder={
                    editingRow?.onChainAmountEth
                      ? `On-chain: ${editingRow.onChainAmountEth}`
                      : "vd: 0.05"
                  }
                  disabled={busy}
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  disabled={busy}
                >
                  <option value="none">Chưa settle</option>
                  <option value="ready">Sẵn sàng</option>
                  <option value="settled">Đã thanh toán (thủ công)</option>
                  <option value="failed">Lỗi</option>
                </select>
              </label>
              {form.status === "settled" ? (
                <label className="lte-perm-span-2">
                  Tx hash (nếu đánh dấu thủ công)
                  <input
                    value={form.txHash}
                    onChange={(e) => setField("txHash", e.target.value)}
                    placeholder="0x…"
                    disabled={busy}
                  />
                </label>
              ) : null}
              <label className="lte-perm-span-2">
                Ghi chú
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setField("note", e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            {editingRow ? (
              <p className="lte-help" style={{ marginTop: 10 }}>
                On-chain: {editingRow.onChainAmountEth || "0"} ETH · đã bán {editingRow.totalSold}/
                {editingRow.totalSupply}
                {editingRow.treasury
                  ? ` · treasury ${editingRow.treasury.balanceEth} ETH`
                  : ""}
              </p>
            ) : null}
          </section>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(settleTarget)}
        onClose={closeSettle}
        title="Thanh toán theo tiến độ hợp đồng"
        subtitle={
          settleTarget
            ? `${settleTarget.title} · ví ${
                settleTarget.payoutWallet
                  ? `${settleTarget.payoutWallet.slice(0, 8)}…${settleTarget.payoutWallet.slice(-4)}`
                  : "chưa cấu hình"
              }`
            : ""
        }
        icon={FileSignature}
        size="xl"
        closeOnBackdrop={!busy}
        footer={
          <>
            <button type="button" className="lte-btn lte-btn-default" disabled={busy} onClick={closeSettle}>
              Đóng
            </button>
            {!activeSettleContract ? (
              <button
                type="button"
                className="lte-btn lte-btn-primary"
                disabled={busy || settleLoading}
                onClick={() => setFullSettleConfirm(true)}
              >
                <Send size={14} /> Settle toàn bộ (không HĐ)
              </button>
            ) : null}
          </>
        }
      >
        {settleLoading && !settleContracts.length ? (
          <p className="lte-help">
            <Loader2 size={14} className="spin" /> Đang tải hợp đồng thanh toán…
          </p>
        ) : null}

        {!settleLoading && settleContracts.length === 0 ? (
          <div>
            <p>
              Sự kiện <strong>«{settleTarget?.title}»</strong> chưa có hợp đồng thanh toán theo tiến
              độ. Bạn có thể settle toàn bộ doanh thu một lần, hoặc tạo HĐ ở menu{" "}
              <strong>Hợp đồng TT</strong>.
            </p>
            <p className="lte-help" style={{ marginTop: 8 }}>
              Số ETH dự kiến:{" "}
              <strong>
                {settleTarget?.settlement?.overrideAmountEth || settleTarget?.amountEth || "0"} ETH
              </strong>{" "}
              → {settleTarget?.payoutWallet || "(chưa có ví)"}
            </p>
            <label className="lte-check" style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Force (bỏ qua điều kiện sold-out — lab)
            </label>
          </div>
        ) : null}

        {activeSettleContract ? (
          <div>
            <div className="lte-perm-profile-grid" style={{ marginBottom: 12 }}>
              {settleContracts.length > 1 ? (
                <label className="lte-perm-span-2">
                  Hợp đồng
                  <select
                    value={activeSettleContract.id}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    disabled={busy}
                  >
                    {settleContracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractNo} · {c.status} · đã trả {c.paidPercent || 0}%
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="lte-perm-span-2">
                  <small>Hợp đồng</small>
                  <div>
                    <strong>{activeSettleContract.contractNo}</strong> — {activeSettleContract.title}
                  </div>
                </div>
              )}
              <div>
                <small>Cơ sở tính %</small>
                <div>
                  <strong>{activeSettleContract.baseAmountEth || "0"} ETH</strong>
                  {activeSettleContract.useOnChainRevenue ? (
                    <span className="lte-help"> (doanh thu on-chain)</span>
                  ) : null}
                </div>
              </div>
              <div>
                <small>Tiến độ HĐ</small>
                <div>
                  Đã trả {activeSettleContract.paidPercent || 0}% ·{" "}
                  {activeSettleContract.paidAmountEth || "0"} ETH
                </div>
              </div>
              <div>
                <small>Bán vé sự kiện</small>
                <div>
                  {settleTarget?.totalSold ?? 0}/{settleTarget?.totalSupply ?? 0}
                  {settleTarget?.soldOut ? " · sold-out" : ""}
                </div>
              </div>
              <div>
                <small>Trạng thái HĐ</small>
                <div>
                  <span
                    className={`lte-badge ${
                      activeSettleContract.status === "active" ||
                      activeSettleContract.status === "completed"
                        ? "ok"
                        : ""
                    }`}
                  >
                    {activeSettleContract.status}
                  </span>
                </div>
              </div>
            </div>

            <p className="lte-help" style={{ marginBottom: 10 }}>
              Mỗi lần bấm <strong>Trả đợt</strong> chuyển đúng % định mức của đợt đó từ treasury về ví
              Ban tổ chức theo HĐ.
            </p>

            <div className="lte-table-wrap">
              <table className="lte-table">
                <thead>
                  <tr>
                    <th>Đợt</th>
                    <th>%</th>
                    <th>Định mức</th>
                    <th>Điều kiện</th>
                    <th>Trạng thái</th>
                    <th>Tx</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(activeSettleContract.stages || []).map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.code}</strong> {s.name}
                      </td>
                      <td>{s.percent}%</td>
                      <td>
                        <strong>{s.plannedAmountEth || "0"} ETH</strong>
                        {s.paidAmountEth ? (
                          <div className="lte-help">đã trả {s.paidAmountEth}</div>
                        ) : null}
                      </td>
                      <td>
                        {TRIGGER_LABEL[s.trigger] || s.trigger}
                        {s.triggerValue ? ` · ${s.triggerValue}` : ""}
                      </td>
                      <td>
                        <span className={`lte-badge ${stageBadgeCls(s.status)}`}>
                          {STAGE_STATUS_LABEL[s.status] || s.status}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {s.txHash ? `${s.txHash.slice(0, 10)}…` : "—"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {s.status === "paid" ? (
                          <CheckCircle2 size={16} style={{ color: "var(--ok, #16a34a)" }} />
                        ) : null}
                        {s.status === "pending" ? (
                          <button
                            type="button"
                            className="lte-btn lte-btn-default lte-btn-sm"
                            disabled={busy}
                            onClick={() => openStage(s)}
                          >
                            Mở đợt
                          </button>
                        ) : null}
                        {s.status === "payable" || s.status === "pending" ? (
                          <button
                            type="button"
                            className="lte-btn lte-btn-primary lte-btn-sm"
                            disabled={
                              busy ||
                              (activeSettleContract.status === "draft" && !force) ||
                              Number(s.plannedAmountEth || 0) <= 0
                            }
                            onClick={() => settleStage(s)}
                            title={
                              activeSettleContract.status === "draft" && !force
                                ? "HĐ nháp — bật Force hoặc kích hoạt HĐ"
                                : Number(s.plannedAmountEth || 0) <= 0
                                  ? "Số ETH đợt = 0"
                                  : `Trả ${s.percent}%`
                            }
                          >
                            <Send size={13} /> Trả {s.percent}%
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="lte-check" style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Force (bỏ qua điều kiện tiến độ / HĐ nháp — lab)
            </label>

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busy || settleLoading}
                onClick={refreshSettleContract}
              >
                <RefreshCw size={14} /> Làm mới đợt
              </button>
              <button
                type="button"
                className="lte-btn lte-btn-default"
                disabled={busy || settleTarget?.settlement?.status === "settled"}
                onClick={() => setFullSettleConfirm(true)}
                title="Settle toàn bộ doanh thu (không theo % đợt)"
              >
                Settle toàn bộ (fallback)
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmModal
        open={fullSettleConfirm}
        onClose={() => setFullSettleConfirm(false)}
        onConfirm={confirmFullSettle}
        title="Settle toàn bộ (không theo đợt HĐ)?"
        message={
          settleTarget
            ? `Chuyển ${
                settleTarget.settlement?.overrideAmountEth || settleTarget.amountEth || "0"
              } ETH từ treasury → ${settleTarget.payoutWallet || "(chưa có ví)"}.${
                force ? " (force)" : ""
              }`
            : undefined
        }
        confirmLabel="Chuyển toàn bộ"
        tone="default"
        icon={Send}
        busy={busy}
      />

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setHardDelete(false);
        }}
        onConfirm={confirmDelete}
        title={hardDelete ? "Xóa cấu hình thanh toán?" : "Reset trạng thái settle?"}
        message={
          deleteTarget
            ? hardDelete
              ? `Xóa hết ví/NH/ghi chú/settle của «${deleteTarget.title}».`
              : `Reset settle của «${deleteTarget.title}» (giữ ví & ghi chú đã lưu) để có thể settle lại.`
            : undefined
        }
        confirmLabel={hardDelete ? "Xóa hết" : "Reset"}
        tone="danger"
        icon={hardDelete ? Trash2 : RotateCcw}
        busy={busy}
      />
    </>
  );
}
