import { useEffect, useMemo, useState } from "react";
import {
  FileSignature,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Send,
  Save,
  CheckCircle2,
  Wallet,
  Percent,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  getAdminPaymentContracts,
  createAdminPaymentContract,
  updateAdminPaymentContract,
  deleteAdminPaymentContract,
  settleAdminPaymentStage,
  patchAdminPaymentStage,
  seedAdminPaymentContracts,
  regenerateAdminPaymentContractPdf,
  fetchAdminPaymentContractPdfBlob,
} from "../../services/api.js";
import AdminModal, { AdminConfirmModal } from "./AdminModal.jsx";

const TRIGGER_LABEL = {
  manual: "Thủ công",
  sales_pct: "% vé đã bán",
  sold_out: "Sold-out",
  date: "Theo ngày",
};

const STATUS_LABEL = {
  draft: "Nháp",
  active: "Hiệu lực",
  completed: "Hoàn tất",
  cancelled: "Huỷ",
  pending: "Chờ",
  payable: "Đến hạn",
  paid: "Đã trả",
  skipped: "Bỏ qua",
};

function stagesFromTemplate(tpl) {
  return (tpl?.stages || []).map((s, i) => ({
    code: s.code,
    name: s.name,
    percent: s.percent,
    trigger: s.trigger || "manual",
    triggerValue: s.triggerValue || "",
    description: s.description || "",
    sortOrder: s.sortOrder ?? i,
  }));
}

function emptyForm(templates = []) {
  const tpl = templates[0];
  return {
    eventId: "",
    organizerProfileId: "",
    title: "",
    contractNo: "",
    templateKey: tpl?.key || "tieu_chuan",
    totalAmountEth: "0",
    useOnChainRevenue: tpl ? Boolean(tpl.useOnChainRevenue) : true,
    payoutWallet: "",
    bankAccount: "",
    bankName: "",
    status: "draft",
    notes: "",
    stages: stagesFromTemplate(tpl),
  };
}

function stageSum(stages) {
  return (stages || []).reduce((n, s) => n + (Number(s.percent) || 0), 0);
}

function badgeCls(status) {
  if (status === "paid" || status === "completed" || status === "active") return "ok";
  if (status === "payable" || status === "failed") return "warn";
  if (status === "cancelled" || status === "skipped") return "danger";
  return "";
}

async function openPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function AdminPaymentContractPanel({ onMessage }) {
  const [contracts, setContracts] = useState([]);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [force, setForce] = useState(false);
  const [detail, setDetail] = useState(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedTemplateKey, setSeedTemplateKey] = useState("tieu_chuan");

  function notify(text) {
    onMessage?.(text);
  }

  async function load() {
    setBusy(true);
    try {
      const data = await getAdminPaymentContracts();
      setContracts(data.contracts || []);
      setEvents(data.events || []);
      setProfiles(data.profiles || []);
      setTemplates(data.templates || []);
      if (detail?.id) {
        const fresh = (data.contracts || []).find((c) => c.id === detail.id);
        if (fresh) setDetail(fresh);
      }
    } catch (e) {
      notify(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const pctSum = useMemo(() => stageSum(form.stages), [form.stages]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyTemplate(templateKey) {
    const tpl = templates.find((t) => t.key === templateKey) || templates[0];
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      templateKey: tpl.key,
      useOnChainRevenue: Boolean(tpl.useOnChainRevenue),
      stages: stagesFromTemplate(tpl),
    }));
  }

  function setStageField(idx, key, value) {
    setForm((f) => {
      const stages = f.stages.map((s, i) => (i === idx ? { ...s, [key]: value } : s));
      return { ...f, stages };
    });
  }

  function addStage() {
    setForm((f) => ({
      ...f,
      stages: [
        ...f.stages,
        {
          code: `D${f.stages.length + 1}`,
          name: `Đợt ${f.stages.length + 1}`,
          percent: 0,
          trigger: "manual",
          triggerValue: "",
          sortOrder: f.stages.length,
        },
      ],
    }));
  }

  function removeStage(idx) {
    setForm((f) => ({
      ...f,
      stages: f.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })),
    }));
  }

  function openCreate() {
    const f = emptyForm(templates);
    if (events[0]) {
      f.eventId = events[0].id;
      f.title = `HĐ thanh toán — ${events[0].title}`;
      f.organizerProfileId = events[0].organizerProfileId || "";
      const p = profiles.find((x) => x.id === f.organizerProfileId);
      if (p) {
        f.payoutWallet = p.payoutWallet || "";
        f.bankAccount = p.bankAccount || "";
        f.bankName = p.bankName || "";
      }
    }
    setForm(f);
    setEditor({ mode: "create" });
  }

  function openEdit(contract) {
    setForm({
      eventId: contract.eventId,
      organizerProfileId: contract.organizerProfileId || "",
      title: contract.title || "",
      contractNo: contract.contractNo || "",
      templateKey: contract.templateKey || "tieu_chuan",
      totalAmountEth: contract.totalAmountEth || "0",
      useOnChainRevenue: Boolean(contract.useOnChainRevenue),
      payoutWallet: contract.payoutWallet || "",
      bankAccount: contract.bankAccount || "",
      bankName: contract.bankName || "",
      status: contract.status || "draft",
      notes: contract.notes || "",
      stages: (contract.stages || []).map((s, i) => ({
        code: s.code,
        name: s.name,
        percent: s.percent,
        trigger: s.trigger || "manual",
        triggerValue: s.triggerValue || "",
        description: s.description || "",
        sortOrder: s.sortOrder ?? i,
        status: s.status,
      })),
    });
    setEditor({ mode: "edit", contract });
  }

  function onPickEvent(eventId) {
    const ev = events.find((e) => e.id === eventId);
    setForm((f) => {
      const next = {
        ...f,
        eventId,
        title: f.title || (ev ? `HĐ thanh toán — ${ev.title}` : f.title),
        organizerProfileId: f.organizerProfileId || ev?.organizerProfileId || "",
      };
      const p = profiles.find((x) => x.id === next.organizerProfileId);
      if (p && !f.payoutWallet) {
        next.payoutWallet = p.payoutWallet || "";
        next.bankAccount = p.bankAccount || f.bankAccount;
        next.bankName = p.bankName || f.bankName;
      }
      return next;
    });
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

  async function onSave(e) {
    e?.preventDefault?.();
    if (!form.eventId) {
      notify("Chọn sự kiện.");
      return;
    }
    if (Math.abs(pctSum - 100) > 0.05) {
      notify(`Tổng % các đợt phải = 100 (hiện ${pctSum}%).`);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        eventId: form.eventId,
        organizerProfileId: form.organizerProfileId || undefined,
        title: form.title.trim(),
        templateKey: form.templateKey,
        totalAmountEth: form.totalAmountEth || "0",
        useOnChainRevenue: form.useOnChainRevenue,
        payoutWallet: form.payoutWallet.trim(),
        bankAccount: form.bankAccount.trim(),
        bankName: form.bankName.trim(),
        status: form.status,
        notes: form.notes.trim(),
        stages: form.stages.map((s, i) => ({
          code: s.code,
          name: s.name,
          percent: Number(s.percent) || 0,
          trigger: s.trigger,
          triggerValue: s.triggerValue,
          description: s.description || "",
          sortOrder: i,
        })),
      };
      if (form.contractNo.trim()) payload.contractNo = form.contractNo.trim();

      let data;
      if (editor?.mode === "edit" && editor.contract?.id) {
        data = await updateAdminPaymentContract(editor.contract.id, payload);
      } else {
        data = await createAdminPaymentContract(payload);
      }
      notify(data.message || "Đã lưu hợp đồng (PDF đã sinh).");
      setEditor(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget?.id) return;
    setBusy(true);
    try {
      const data = await deleteAdminPaymentContract(deleteTarget.id);
      notify(data.message || "Đã xóa/huỷ hợp đồng.");
      setDeleteTarget(null);
      if (detail?.id === deleteTarget.id) setDetail(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSettle() {
    if (!settleTarget?.contract?.id || !settleTarget?.stage?.id) return;
    setBusy(true);
    try {
      const data = await settleAdminPaymentStage(
        settleTarget.contract.id,
        settleTarget.stage.id,
        { force }
      );
      notify(data.message || "Đã thanh toán đợt.");
      setSettleTarget(null);
      setForce(false);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPayable(contract, stage) {
    setBusy(true);
    try {
      await patchAdminPaymentStage(contract.id, stage.id, { status: "payable" });
      notify(`Đợt «${stage.name}» đã mở đến hạn thanh toán.`);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onViewPdf(contract) {
    if (!contract?.id) return;
    setBusy(true);
    try {
      const blob = await fetchAdminPaymentContractPdfBlob(contract.id);
      await openPdfBlob(blob);
    } catch (err) {
      notify(err.response?.data?.error || err.message || "Không mở được PDF");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenPdf(contract) {
    if (!contract?.id) return;
    setBusy(true);
    try {
      const data = await regenerateAdminPaymentContractPdf(contract.id);
      notify(data.message || "Đã sinh lại PDF.");
      await load();
      const blob = await fetchAdminPaymentContractPdfBlob(contract.id);
      await openPdfBlob(blob);
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSeed() {
    setBusy(true);
    try {
      const data = await seedAdminPaymentContracts({
        templateKey: seedTemplateKey || "tieu_chuan",
        status: "active",
        onlyMissing: true,
      });
      notify(data.message || `Đã tạo ${data.createdCount} HĐ mẫu.`);
      setSeedOpen(false);
      await load();
    } catch (err) {
      notify(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lte-box">
      <div className="lte-box-header" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ flex: 1 }}>
          <FileSignature size={18} style={{ verticalAlign: -3 }} /> Hợp đồng thanh toán theo tiến độ
        </h3>
        <button type="button" className="lte-btn lte-btn-default" onClick={load} disabled={busy}>
          {busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Làm mới
        </button>
        <button
          type="button"
          className="lte-btn lte-btn-default"
          onClick={() => {
            setSeedTemplateKey(templates[0]?.key || "tieu_chuan");
            setSeedOpen(true);
          }}
          disabled={busy}
        >
          <Sparkles size={14} /> Tạo mẫu cho sự kiện
        </button>
        <button type="button" className="lte-btn lte-btn-primary" onClick={openCreate} disabled={busy}>
          <Plus size={14} /> Tạo hợp đồng
        </button>
      </div>

      <div className="lte-box-body lte-box-body-flush">
        <p style={{ padding: "12px 16px", margin: 0, opacity: 0.85, fontSize: 13 }}>
          Chọn mẫu HĐ (định mức %), tạo cho từng sự kiện hoặc sinh hàng loạt. Hệ thống tự xuất PDF
          tiếng Việt; mỗi lần thanh toán đợt căn cứ % định mức trên tổng HĐ / doanh thu on-chain.
        </p>
        {templates.length > 0 && (
          <div
            style={{
              padding: "0 16px 12px",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 12,
            }}
          >
            {templates.map((t) => (
              <span key={t.key} className="lte-badge" title={t.description}>
                {t.label} · {t.stageCount} đợt
              </span>
            ))}
          </div>
        )}
        <table className="lte-table">
          <thead>
            <tr>
              <th>Số HĐ</th>
              <th>Sự kiện</th>
              <th>BTC</th>
              <th>Tổng / Đã trả</th>
              <th>Tiến độ</th>
              <th>PDF</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 24, opacity: 0.7 }}>
                  Chưa có hợp đồng — bấm «Tạo mẫu cho sự kiện» để sinh HĐ + PDF cho mọi sự kiện.
                </td>
              </tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => setDetail(c)}
                    style={{
                      background: "none",
                      border: 0,
                      cursor: "pointer",
                      color: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    {c.contractNo}
                  </button>
                  <div>
                    <small style={{ opacity: 0.65 }}>{c.templateKey}</small>
                  </div>
                </td>
                <td>{c.eventTitle || c.eventId}</td>
                <td>{c.organizerName || "—"}</td>
                <td>
                  <div>{c.baseAmountEth || c.totalAmountEth} ETH</div>
                  <small style={{ opacity: 0.7 }}>
                    Đã trả {c.paidAmountEth || "0"} ({c.paidPercent || 0}%)
                  </small>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(c.stages || []).map((s) => (
                      <span key={s.id} className={`lte-badge ${badgeCls(s.status)}`} title={s.name}>
                        {s.code} {s.percent}%
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default lte-btn-sm"
                    onClick={() => onViewPdf(c)}
                    disabled={busy}
                    title="Xem PDF"
                  >
                    <FileText size={13} /> {c.hasPdf ? "Xem" : "Sinh"}
                  </button>
                </td>
                <td>
                  <span className={`lte-badge ${badgeCls(c.status)}`}>
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default lte-btn-sm"
                    onClick={() => setDetail(c)}
                  >
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default lte-btn-sm"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="lte-btn lte-btn-default lte-btn-sm"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.mode === "edit" ? "Sửa hợp đồng thanh toán" : "Tạo hợp đồng thanh toán"}
        size="xl"
        footer={
          <>
            <button type="button" className="lte-btn lte-btn-default" onClick={() => setEditor(null)}>
              Huỷ
            </button>
            <button
              type="submit"
              form="admin-pc-form"
              className="lte-btn lte-btn-primary"
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Lưu &amp; sinh PDF
            </button>
          </>
        }
      >
        <form id="admin-pc-form" className="lte-form" onSubmit={onSave}>
          <div className="lte-form-grid">
            <label>
              Mẫu hợp đồng
              <select value={form.templateKey} onChange={(e) => applyTemplate(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <small className="lte-help">
                {templates.find((t) => t.key === form.templateKey)?.description || ""}
              </small>
            </label>
            <label>
              Sự kiện
              <select
                value={form.eventId}
                onChange={(e) => onPickEvent(e.target.value)}
                disabled={editor?.mode === "edit"}
                required
              >
                <option value="">— Chọn —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ban tổ chức
              <select
                value={form.organizerProfileId}
                onChange={(e) => onPickProfile(e.target.value)}
              >
                <option value="">— Không gắn —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.organizationName} ({p.profileCode})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tiêu đề HĐ
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
              />
            </label>
            <label>
              Số HĐ (tuỳ chọn)
              <input
                value={form.contractNo}
                onChange={(e) => setField("contractNo", e.target.value)}
                placeholder="Tự sinh nếu trống"
                disabled={editor?.mode === "edit"}
              />
            </label>
            <label>
              Tổng giá trị HĐ (ETH)
              <input
                value={form.totalAmountEth}
                onChange={(e) => setField("totalAmountEth", e.target.value)}
                disabled={form.useOnChainRevenue}
              />
            </label>
            <label className="lte-check">
              <input
                type="checkbox"
                checked={form.useOnChainRevenue}
                onChange={(e) => setField("useOnChainRevenue", e.target.checked)}
              />
              Dùng doanh thu on-chain làm cơ sở %
            </label>
            <label>
              Ví nhận (payout)
              <input
                value={form.payoutWallet}
                onChange={(e) => setField("payoutWallet", e.target.value)}
                placeholder="0x…"
              />
            </label>
            <label>
              Trạng thái HĐ
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="draft">Nháp</option>
                <option value="active">Hiệu lực</option>
                <option value="cancelled">Huỷ</option>
              </select>
            </label>
            <label>
              Ngân hàng
              <input value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
            </label>
            <label>
              Số TK
              <input
                value={form.bankAccount}
                onChange={(e) => setField("bankAccount", e.target.value)}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Ghi chú
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Percent size={16} />
              <strong>Các đợt thanh toán</strong>
              <span className={`lte-badge ${Math.abs(pctSum - 100) < 0.05 ? "ok" : "warn"}`}>
                Tổng {pctSum}%
              </span>
              <button
                type="button"
                className="lte-btn lte-btn-default lte-btn-sm"
                onClick={addStage}
                style={{ marginLeft: "auto" }}
              >
                <Plus size={13} /> Thêm đợt
              </button>
            </div>
            <table className="lte-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên đợt</th>
                  <th>%</th>
                  <th>Điều kiện</th>
                  <th>Giá trị</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.stages.map((s, idx) => (
                  <tr key={`${s.code}-${idx}`}>
                    <td>
                      <input
                        value={s.code}
                        onChange={(e) => setStageField(idx, "code", e.target.value)}
                        style={{ width: 64 }}
                      />
                    </td>
                    <td>
                      <input
                        value={s.name}
                        onChange={(e) => setStageField(idx, "name", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={s.percent}
                        onChange={(e) => setStageField(idx, "percent", e.target.value)}
                        style={{ width: 72 }}
                      />
                    </td>
                    <td>
                      <select
                        value={s.trigger}
                        onChange={(e) => setStageField(idx, "trigger", e.target.value)}
                      >
                        <option value="manual">Thủ công</option>
                        <option value="sales_pct">% vé đã bán</option>
                        <option value="sold_out">Sold-out</option>
                        <option value="date">Theo ngày</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={s.triggerValue}
                        onChange={(e) => setStageField(idx, "triggerValue", e.target.value)}
                        placeholder={
                          s.trigger === "sales_pct"
                            ? "vd 50"
                            : s.trigger === "date"
                              ? "YYYY-MM-DD"
                              : "—"
                        }
                        disabled={s.trigger === "manual" || s.trigger === "sold_out"}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="lte-btn lte-btn-default lte-btn-sm"
                        onClick={() => removeStage(idx)}
                        disabled={form.stages.length <= 1}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.contractNo} — ${detail.title}` : ""}
        size="xl"
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => onViewPdf(detail)}
            >
              <FileText size={14} /> Xem PDF
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => onRegenPdf(detail)}
            >
              Sinh lại PDF
            </button>
            <button type="button" className="lte-btn lte-btn-default" onClick={() => setDetail(null)}>
              Đóng
            </button>
          </>
        }
      >
        {detail && (
          <div>
            <div className="lte-form-grid" style={{ marginBottom: 16 }}>
              <div>
                <small>Sự kiện</small>
                <div>{detail.eventTitle}</div>
              </div>
              <div>
                <small>Ban tổ chức</small>
                <div>{detail.organizerName || "—"}</div>
              </div>
              <div>
                <small>Mẫu HĐ</small>
                <div>{detail.templateKey}</div>
              </div>
              <div>
                <small>Cơ sở tính %</small>
                <div>
                  {detail.baseAmountEth} ETH
                  {detail.useOnChainRevenue ? " (on-chain)" : ""}
                </div>
              </div>
              <div>
                <small>Ví nhận</small>
                <div style={{ wordBreak: "break-all" }}>
                  {detail.payoutWallet ? (
                    <>
                      <Wallet size={13} /> {detail.payoutWallet}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <small>Đã thanh toán</small>
                <div>
                  {detail.paidPercent}% · {detail.paidAmountEth} ETH
                </div>
              </div>
              <div>
                <small>Bán vé</small>
                <div>
                  {detail.eventSales
                    ? `${detail.eventSales.totalSold}/${detail.eventSales.totalSupply}${
                        detail.eventSales.soldOut ? " · sold-out" : ""
                      }`
                    : "—"}
                </div>
              </div>
              <div>
                <small>PDF</small>
                <div>{detail.hasPdf ? "Đã sinh" : "Chưa có — bấm Sinh lại"}</div>
              </div>
            </div>

            <table className="lte-table">
              <thead>
                <tr>
                  <th>Đợt</th>
                  <th>%</th>
                  <th>Định mức</th>
                  <th>Điều kiện</th>
                  <th>TT</th>
                  <th>Tx</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(detail.stages || []).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.code}</strong> {s.name}
                    </td>
                    <td>{s.percent}%</td>
                    <td>{s.plannedAmountEth} ETH</td>
                    <td>
                      {TRIGGER_LABEL[s.trigger] || s.trigger}
                      {s.triggerValue ? ` · ${s.triggerValue}` : ""}
                    </td>
                    <td>
                      <span className={`lte-badge ${badgeCls(s.status)}`}>
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                      {s.paidAmountEth ? (
                        <div>
                          <small>{s.paidAmountEth} ETH</small>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ fontSize: 11, wordBreak: "break-all" }}>
                      {s.txHash ? `${s.txHash.slice(0, 10)}…` : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {s.status === "pending" && (
                        <button
                          type="button"
                          className="lte-btn lte-btn-default lte-btn-sm"
                          onClick={() => markPayable(detail, s)}
                          disabled={busy}
                        >
                          Mở đợt
                        </button>
                      )}
                      {(s.status === "payable" || s.status === "pending") && (
                        <button
                          type="button"
                          className="lte-btn lte-btn-primary lte-btn-sm"
                          onClick={() => setSettleTarget({ contract: detail, stage: s })}
                          disabled={busy || detail.status === "draft"}
                          title={detail.status === "draft" ? "Kích hoạt HĐ trước" : ""}
                        >
                          <Send size={13} /> Trả {s.percent}%
                        </button>
                      )}
                      {s.status === "paid" && (
                        <CheckCircle2 size={16} style={{ color: "var(--ok, #16a34a)" }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(settleTarget)}
        onClose={() => {
          if (busy) return;
          setSettleTarget(null);
          setForce(false);
        }}
        title="Thanh toán đợt theo HĐ"
        size="md"
        icon={Send}
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => {
                setSettleTarget(null);
                setForce(false);
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="lte-btn lte-btn-primary"
              disabled={busy}
              onClick={onSettle}
            >
              {busy ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Chuyển ETH
            </button>
          </>
        }
      >
        {settleTarget && (
          <div>
            <p>
              Thanh toán đợt <strong>«{settleTarget.stage.name}»</strong> (
              {settleTarget.stage.percent}% định mức) ={" "}
              <strong>{settleTarget.stage.plannedAmountEth} ETH</strong> từ treasury → ví Ban tổ
              chức theo hợp đồng {settleTarget.contract.contractNo}.
            </p>
            <label className="lte-check" style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              Force (bỏ qua điều kiện tiến độ / HĐ chưa active — lab)
            </label>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={seedOpen}
        onClose={() => !busy && setSeedOpen(false)}
        title="Tạo hợp đồng mẫu cho các sự kiện"
        size="md"
        icon={Sparkles}
        footer={
          <>
            <button
              type="button"
              className="lte-btn lte-btn-default"
              disabled={busy}
              onClick={() => setSeedOpen(false)}
            >
              Huỷ
            </button>
            <button type="button" className="lte-btn lte-btn-primary" disabled={busy} onClick={onSeed}>
              {busy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Sinh HĐ + PDF
            </button>
          </>
        }
      >
        <p>
          Tạo hợp đồng thanh toán (và file PDF) cho mọi sự kiện <strong>chưa có HĐ</strong>, theo mẫu
          đã chọn. Sự kiện đã có hợp đồng sẽ được bỏ qua.
        </p>
        <label style={{ display: "block", marginTop: 12 }}>
          Mẫu áp dụng
          <select
            value={seedTemplateKey}
            onChange={(e) => setSeedTemplateKey(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6 }}
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 10 }}>
          {templates.find((t) => t.key === seedTemplateKey)?.description || ""}
        </p>
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xóa / huỷ hợp đồng"
        confirmLabel="Xác nhận"
        tone="danger"
        onConfirm={onDelete}
        busy={busy}
        icon={Trash2}
        message={
          deleteTarget
            ? `Xóa «${deleteTarget.contractNo}»? Nếu đã có đợt đã trả, hệ thống chỉ chuyển trạng thái cancelled.`
            : undefined
        }
      />
    </div>
  );
}
